import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const approvals = await prisma.approval.findMany({
      include: {
        purchaseOrder: {
          include: {
            supplier: {
              select: {
                name: true,
              },
            },
          },
        },
        order: {
          include: {
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
        approver: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Convert decimal values to numbers for JSON serialization
    const serializedApprovals = approvals.map((approval) => {
      const purchaseOrder = approval.purchaseOrder
        ? {
            ...approval.purchaseOrder,
            totalAmount: Number(approval.purchaseOrder.totalAmount),
          }
        : null

      const order = approval.order
        ? {
            ...approval.order,
            totalAmount: Number(approval.order.totalAmount),
          }
        : null

      return {
        ...approval,
        purchaseOrder,
        order,
      }
    })

    return NextResponse.json({ status: "success", data: serializedApprovals })
  } catch (error) {
    console.error("[GET /api/approvals] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
