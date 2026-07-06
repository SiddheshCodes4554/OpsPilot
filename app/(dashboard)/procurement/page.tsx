import React from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import { prisma } from "@/lib/prisma"
import { ProcurementClient } from "@/components/procurement/ProcurementClient"

export const dynamic = "force-dynamic"

export default async function ProcurementPage() {
  // Fetch initial data needed for Procurement management
  const [purchaseOrders, suppliers, products] = await Promise.all([
    prisma.purchaseOrder.findMany({
      include: {
        supplier: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, sku: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      select: { id: true, sku: true, name: true, price: true },
      orderBy: { name: "asc" },
    }),
  ])

  // Serialize models for standard JSON transmission
  const initialOrders = purchaseOrders.map((po) => ({
    id: po.id,
    supplierId: po.supplierId,
    supplierName: po.supplier.name,
    status: po.status,
    totalAmount: Number(po.totalAmount),
    eta: po.eta ? po.eta.toISOString() : null,
    createdAt: po.createdAt.toISOString(),
    items: po.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productSku: item.product.sku,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
    })),
  }))

  const serializedProducts = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    price: Number(p.price),
  }))

  return (
    <PageContainer
      title="Procurement Orders"
      description="Create purchase orders, manage wholesale suppliers, and track incoming shipments."
    >
      <ProcurementClient
        initialOrders={initialOrders}
        suppliersList={suppliers}
        productsList={serializedProducts}
      />
    </PageContainer>
  )
}
