import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { EmailService } from "@/lib/email/EmailService"

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
      })
    })

    const fullOrder = await prisma.order.findUnique({
      where: { id: orderId },
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

    if (!fullOrder) {
      return NextResponse.json({ status: "error", message: "Updated order not found." }, { status: 404 })
    }

    // Send status update email dynamically
    try {
      const emailService = EmailService.fromEnv()
      const customerName = fullOrder.customer.name
      const customerEmail = fullOrder.customer.email
      const orderRef = `ORD-${fullOrder.id.substring(0, 8).toUpperCase()}`

      const itemsList = fullOrder.items
        .map((item) => `- ${item.quantity}x ${item.product.name} (SKU: ${item.product.sku})`)
        .join("\n")

      let subject = ""
      let body = ""

      switch (newStatus) {
        case "PROCESSING":
          subject = `Your Order ${orderRef} is now Processing`
          body = `Dear ${customerName},\n\nGood news! We are now processing your order for the following items:\n\n${itemsList}\n\nWe will notify you with another email once your items have shipped.\n\nBest regards,\nOpsPilot Operations Team`
          break
        case "SHIPPED":
          subject = `Your Order ${orderRef} has Shipped!`
          body = `Dear ${customerName},\n\nYour order has been shipped from our warehouse! It is on its way to you.\n\nItems shipped:\n\n${itemsList}\n\nThank you for shopping with us!\n\nBest regards,\nOpsPilot Operations Team`
          break
        case "DELIVERED":
          subject = `Your Order ${orderRef} has been Delivered`
          body = `Dear ${customerName},\n\nOur logistics partner confirms that your order has been successfully delivered. We hope you love your new products!\n\nItems delivered:\n\n${itemsList}\n\nBest regards,\nOpsPilot Operations Team`
          break
        case "CANCELLED":
          subject = `Your Order ${orderRef} has been Cancelled`
          body = `Dear ${customerName},\n\nYour order has been cancelled. Any reserved stock has been returned to our inventory, and if you were charged, a refund request has been initiated.\n\nBest regards,\nOpsPilot Operations Team`
          break
        case "REFUNDED":
          subject = `Refund Completed for Order ${orderRef}`
          body = `Dear ${customerName},\n\nWe have successfully completed a full refund of your order. The funds should reflect in your account within 3-5 business days depending on your payment provider.\n\nBest regards,\nOpsPilot Operations Team`
          break
        default:
          subject = `Order ${orderRef} Status Update`
          body = `Dear ${customerName},\n\nYour order status has been updated to ${newStatus}.\n\nBest regards,\nOpsPilot Operations Team`
          break
      }

      await emailService.sendCustomerEmail(customerEmail, subject, body)
      console.log(`[Order Email] Dynamic status update email sent to ${customerEmail} for status ${newStatus}`)
    } catch (emailErr) {
      console.error("[Order Email] Failed to send dynamic status update email:", emailErr)
    }

    const serializedOrder = {
      ...fullOrder,
      totalAmount: Number(fullOrder.totalAmount),
      items: fullOrder.items.map((item) => ({
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

