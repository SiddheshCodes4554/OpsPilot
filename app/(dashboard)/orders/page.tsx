import React from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import { prisma } from "@/lib/prisma"
import { OrdersClient } from "@/components/orders/OrdersClient"

export const dynamic = "force-dynamic"

export default async function OrdersPage() {
  // Fetch initial orders
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

  const initialData = orders.map((order) => ({
    id: order.id,
    customerId: order.customerId,
    customerName: order.customer.name,
    customerEmail: order.customer.email,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productSku: item.product.sku,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
  }))

  return (
    <PageContainer
      title="Sales Orders"
      description="Monitor customer orders, manage processing status, and track transactions."
    >
      <OrdersClient initialData={initialData} />
    </PageContainer>
  )
}
