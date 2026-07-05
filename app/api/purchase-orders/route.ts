import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PurchaseOrderStatus } from "@prisma/client"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, supplierId, userId, status, totalAmount, eta, items } = body as {
      id?: string
      supplierId?: string
      userId?: string
      status?: PurchaseOrderStatus
      totalAmount?: number
      eta?: string
      items?: { productId: string; quantity: number; unitPrice: number }[]
    }

    // 1. UPDATE EXISTING PURCHASE ORDER
    if (id) {
      const updateData: Record<string, unknown> = {}
      if (status) updateData.status = status
      if (eta) updateData.eta = new Date(eta)
      if (totalAmount !== undefined) updateData.totalAmount = totalAmount

      const updatedPo = await prisma.purchaseOrder.update({
        where: { id },
        data: updateData,
        include: {
          items: true,
          supplier: true,
        },
      })

      // Convert Decimals to Numbers
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
    if (!supplierId) {
      return NextResponse.json({ status: "error", message: "Missing supplierId." }, { status: 400 })
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ status: "error", message: "Missing or empty items list." }, { status: 400 })
    }

    const calculatedTotalAmount = totalAmount ?? items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

    const newPo = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        userId: userId || null,
        status: status || "PENDING",
        totalAmount: calculatedTotalAmount,
        eta: eta ? new Date(eta) : null,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        items: true,
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
