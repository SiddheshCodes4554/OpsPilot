import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        items: {
          include: {
            product: {
              select: {
                sku: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Serialize Decimals to Numbers
    const serializedOrders = orders.map((order) => ({
      ...order,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
      })),
    }))

    return NextResponse.json({ status: "success", data: serializedOrders })
  } catch (error) {
    console.error("[GET /api/orders] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { customerId, userId, items } = body as {
      customerId: string
      userId?: string
      items: { productId: string; quantity: number }[]
    }

    if (!customerId) {
      return NextResponse.json({ status: "error", message: "Missing customerId." }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ status: "error", message: "Missing or invalid items array." }, { status: 400 })
    }

    // Run transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Fetch product prices and verify inventory
      let totalAmount = 0
      const orderItemsToCreate = []

      for (const item of items) {
        if (!item.productId || item.quantity <= 0) {
          throw new Error("Invalid product details in items list.")
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { inventory: true },
        })

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`)
        }

        const stock = product.inventory?.quantity ?? 0
        if (stock < item.quantity) {
          throw new Error(`Insufficient stock for product "${product.name}". Available: ${stock}, Requested: ${item.quantity}`)
        }

        const unitPrice = Number(product.price)
        totalAmount += unitPrice * item.quantity

        orderItemsToCreate.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.price,
        })

        // 2. Decrement inventory
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        })
      }

      // 3. Create order
      const order = await tx.order.create({
        data: {
          customerId,
          userId: userId || null,
          totalAmount,
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          items: true,
        },
      })

      return order
    })

    const serializedOrder = {
      ...newOrder,
      totalAmount: Number(newOrder.totalAmount),
      items: newOrder.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
      })),
    }

    return NextResponse.json({ status: "success", data: serializedOrder }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/orders] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// PUT - Update order status and adjust inventory dynamically
// ---------------------------------------------------------------------------
const UpdateOrderStatusSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
})

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const parsed = UpdateOrderStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", code: "VALIDATION_FAILED", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const { orderId, status: newStatus } = parsed.data

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Fetch current order with items
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      })

      if (!order) {
        throw new Error(`Order "${orderId}" not found.`)
      }

      const oldStatus = order.status

      // If status hasn't changed, do nothing
      if (oldStatus === newStatus) {
        return order
      }

      const wasCancelledOrRefunded = oldStatus === "CANCELLED" || oldStatus === "REFUNDED"
      const isCancelledOrRefunded = newStatus === "CANCELLED" || newStatus === "REFUNDED"

      // 2. Adjust inventory levels if transition demands it
      if (!wasCancelledOrRefunded && isCancelledOrRefunded) {
        // Increment stock back (restoring cancelled/refunded order items)
        for (const item of order.items) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { quantity: { increment: item.quantity } },
          })
        }
      } else if (wasCancelledOrRefunded && !isCancelledOrRefunded) {
        // Decrement stock again (order is active again)
        for (const item of order.items) {
          // Check stock before re-reserving
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            include: { inventory: true },
          })
          const stock = product?.inventory?.quantity ?? 0
          if (stock < item.quantity) {
            throw new Error(`Insufficient stock to re-activate order for product "${product?.name}". Available: ${stock}, Requested: ${item.quantity}`)
          }

          await tx.inventory.update({
            where: { productId: item.productId },
            data: { quantity: { decrement: item.quantity } },
          })
        }
      }

      // 3. Update order status
      return tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
        include: {
          customer: true,
          items: {
            include: {
              product: {
                select: { sku: true, name: true },
              },
            },
          },
        },
      })
    })

    const serializedOrder = {
      ...updatedOrder,
      totalAmount: Number(updatedOrder.totalAmount),
      items: updatedOrder.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
      })),
    }

    return NextResponse.json({ status: "success", data: serializedOrder })
  } catch (error) {
    console.error("[PUT /api/orders] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}

