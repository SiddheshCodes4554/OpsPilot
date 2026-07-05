import React from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import { prisma } from "@/lib/prisma"
import { InventoryClient } from "@/components/inventory/InventoryClient"

export default async function InventoryPage() {
  // Fetch all suppliers for filter dropdown
  const suppliersList = await prisma.supplier.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  })

  // Fetch all products with inventory and orderItem relations
  const products = await prisma.product.findMany({
    include: {
      inventory: true,
      supplier: true,
      orderItems: {
        include: {
          order: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  })

  // Format products to compile the initial InventoryItem state props
  const initialData = products.map((product) => {
    const inv = product.inventory
    const reserved = product.orderItems
      .filter(
        (item) =>
          item.order.status === "PENDING" || item.order.status === "PROCESSING"
      )
      .reduce((sum, item) => sum + item.quantity, 0)

    return {
      id: inv?.id || `no-inv-${product.id}`,
      productId: product.id,
      quantity: inv?.quantity ?? 0,
      location: inv?.location || null,
      minStockLevel: inv?.minStockLevel ?? 10,
      reserved,
      productName: product.name,
      productSku: product.sku,
      productPrice: Number(product.price),
      supplierName: product.supplier?.name || "N/A",
      supplierId: product.supplierId || null,
    }
  })

  return (
    <PageContainer
      title="Inventory Ledger"
      description="Stock levels, product reservations, active supplier allocations, and threshold monitoring."
    >
      <InventoryClient initialData={initialData} suppliersList={suppliersList} />
    </PageContainer>
  )
}
