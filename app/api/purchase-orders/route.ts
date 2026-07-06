import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PurchaseOrderStatus } from "@prisma/client"
import { z } from "zod"

// ---------------------------------------------------------------------------
// GET - Retrieve all purchase orders
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      include: {
        supplier: {
          select: { name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { sku: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const serialized = purchaseOrders.map((po) => ({
      ...po,
      totalAmount: Number(po.totalAmount),
      items: po.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
      })),
    }))

    return NextResponse.json({ status: "success", data: serialized })
  } catch (error) {
    console.error("[GET /api/purchase-orders] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST - Create or Update a Purchase Order with dynamic inventory updates
// ---------------------------------------------------------------------------
const PurchaseOrderSchema = z.object({
  id: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PENDING", "APPROVED", "ORDERED", "DELIVERED", "RECEIVED", "REJECTED"]).optional(),
  totalAmount: z.coerce.number().min(0).optional(),
  eta: z.string().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.coerce.number().int().min(1),
      unitPrice: z.coerce.number().min(0),
    })
  ).optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = PurchaseOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", code: "VALIDATION_FAILED", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const data = parsed.data

    // 1. UPDATE EXISTING PURCHASE ORDER
    if (data.id) {
      const updatedPo = await prisma.$transaction(async (tx) => {
        // Fetch current PO
        const currentPo = await tx.purchaseOrder.findUnique({
          where: { id: data.id! },
          include: { items: true },
        })

        if (!currentPo) {
          throw new Error(`Purchase order "${data.id}" not found.`)
        }

        const oldStatus = currentPo.status
        const newStatus = data.status

        const updateData: Record<string, any> = {}
        if (newStatus) updateData.status = newStatus
        if (data.eta) updateData.eta = new Date(data.eta)
        if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount

        // Perform PO update
        const po = await tx.purchaseOrder.update({
          where: { id: data.id! },
          data: updateData,
          include: {
            items: {
              include: {
                product: {
                  select: { sku: true, name: true },
                },
              },
            },
            supplier: true,
          },
        })

        // Check if status changed to DELIVERED or RECEIVED (to increment stock levels)
        const wasDelivered = oldStatus === "DELIVERED" || oldStatus === "RECEIVED"
        const isDelivered = newStatus === "DELIVERED" || newStatus === "RECEIVED"

        if (!wasDelivered && isDelivered) {
          // Increment inventory levels by the purchase order items' quantity!
          for (const item of po.items) {
            // Check if inventory record exists for the product
            const existingInventory = await tx.inventory.findUnique({
              where: { productId: item.productId },
            })

            if (existingInventory) {
              await tx.inventory.update({
                where: { productId: item.productId },
                data: { quantity: { increment: item.quantity } },
              })
            } else {
              // Create inventory record if not present
              await tx.inventory.create({
                data: {
                  productId: item.productId,
                  quantity: item.quantity,
                  minStockLevel: 10,
                },
              })
            }
          }
        }

        return po
      })

      const serializedPo = {
        ...updatedPo,
        totalAmount: Number(updatedPo.totalAmount),
        items: updatedPo.items.map((item) => ({
          ...item,
          unitPrice: Number(item.unitPrice),
        })),
      }

      return NextResponse.json({ status: "success", data: serializedPo })
    }

    // 2. CREATE NEW PURCHASE ORDER
    if (!data.supplierId) {
      return NextResponse.json({ status: "error", message: "Missing supplierId." }, { status: 400 })
    }
    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ status: "error", message: "Missing or empty items list." }, { status: 400 })
    }

    const calculatedTotalAmount = data.totalAmount ?? data.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

    const newPo = await prisma.purchaseOrder.create({
      data: {
        supplierId: data.supplierId,
        userId: data.userId || null,
        status: (data.status as PurchaseOrderStatus) || "PENDING",
        totalAmount: calculatedTotalAmount,
        eta: data.eta ? new Date(data.eta) : null,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { sku: true, name: true },
            },
          },
        },
        supplier: true,
      },
    })

    const serializedPo = {
      ...newPo,
      totalAmount: Number(newPo.totalAmount),
      items: newPo.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
      })),
    }

    return NextResponse.json({ status: "success", data: serializedPo }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/purchase-orders] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
