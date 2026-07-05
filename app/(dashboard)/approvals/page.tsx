import React from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import { prisma } from "@/lib/prisma"
import { ApprovalsClient } from "@/components/approvals/ApprovalsClient"

export default async function ApprovalsPage() {
  // Fetch all pending approvals from PostgreSQL database
  const approvals = await prisma.approval.findMany({
    where: {
      status: "PENDING",
    },
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
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Format decimal values and dates for JSON client-side serialization
  const serializedApprovals = approvals.map((app) => {
    const purchaseOrder = app.purchaseOrder
      ? {
          id: app.purchaseOrder.id,
          totalAmount: Number(app.purchaseOrder.totalAmount),
          status: app.purchaseOrder.status,
          supplier: app.purchaseOrder.supplier,
        }
      : null

    const order = app.order
      ? {
          id: app.order.id,
          totalAmount: Number(app.order.totalAmount),
          status: app.order.status,
          customer: app.order.customer,
        }
      : null

    return {
      id: app.id,
      purchaseOrderId: app.purchaseOrderId,
      orderId: app.orderId,
      status: app.status,
      comments: app.comments,
      createdAt: app.createdAt.toISOString(),
      purchaseOrder,
      order,
    }
  })

  return (
    <PageContainer
      title="Approval Center"
      description="Resolve high-value procurement requests and purchase orders."
    >
      <ApprovalsClient initialApprovals={serializedApprovals} />
    </PageContainer>
  )
}
