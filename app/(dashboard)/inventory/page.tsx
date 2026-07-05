import React from "react"
import Link from "next/link"
import { PageContainer } from "@/components/layout/PageContainer"
import { Card } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

interface InventoryPageProps {
  searchParams: Promise<{
    search?: string
    supplier?: string
    status?: string
  }>
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const params = await searchParams
  const searchQuery = params.search || ""
  const supplierId = params.supplier || ""
  const statusFilter = params.status || ""

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

  // Fetch all products with inventory, supplier, and orderItem relations
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

  // Process products, calculate reserved quantity, status and filter them
  const processedProducts = products
    .map((product) => {
      const stock = product.inventory?.quantity ?? 0
      const threshold = product.inventory?.minStockLevel ?? 10

      // Calculate reserved items from pending/processing customer orders
      const reserved = product.orderItems
        .filter(
          (item) =>
            item.order.status === "PENDING" || item.order.status === "PROCESSING"
        )
        .reduce((sum, item) => sum + item.quantity, 0)

      let statusLabel = "In Stock"
      let statusColor = "text-emerald-400 bg-emerald-950/30 border-emerald-900/50"

      if (stock === 0) {
        statusLabel = "Out of Stock"
        statusColor = "text-red-400 bg-red-950/30 border-red-900/50"
      } else if (stock <= threshold) {
        statusLabel = "Low Stock"
        statusColor = "text-amber-400 bg-amber-950/30 border-amber-900/50"
      }

      return {
        ...product,
        stock,
        threshold,
        reserved,
        statusLabel,
        statusColor,
      }
    })
    .filter((product) => {
      // 1. Search Query Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = product.name.toLowerCase().includes(query)
        const matchesSku = product.sku.toLowerCase().includes(query)
        if (!matchesName && !matchesSku) return false
      }

      // 2. Supplier Filter
      if (supplierId && product.supplierId !== supplierId) {
        return false
      }

      // 3. Status Filter
      if (statusFilter) {
        if (statusFilter === "in_stock" && product.statusLabel !== "In Stock") return false
        if (statusFilter === "low_stock" && product.statusLabel !== "Low Stock") return false
        if (statusFilter === "out_of_stock" && product.statusLabel !== "Out of Stock") return false
      }

      return true
    })

  return (
    <PageContainer
      title="Inventory Ledger"
      description="Stock levels, product reservations, active supplier allocations, and threshold monitoring."
    >
      <div className="space-y-6">
        {/* Search & Filter Controls (Server Action Form) */}
        <Card className="bg-zinc-950 border-zinc-900 p-4">
          <form method="GET" action="/inventory" className="flex flex-wrap items-center gap-4 text-xs">
            {/* Search Input */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                name="search"
                defaultValue={searchQuery}
                placeholder="Search by product name or SKU..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100 placeholder-zinc-550 focus:outline-none focus:border-zinc-700"
              />
            </div>

            {/* Supplier Filter */}
            <div className="w-[180px]">
              <select
                name="supplier"
                defaultValue={supplierId}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-zinc-700"
              >
                <option value="">All Suppliers</option>
                {suppliersList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-[150px]">
              <select
                name="status"
                defaultValue={statusFilter}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-zinc-700"
              >
                <option value="">All Statuses</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded font-medium bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition-colors"
              >
                Filter
              </button>
              {(searchQuery || supplierId || statusFilter) && (
                <Link
                  href="/inventory"
                  className="px-3.5 py-1.5 rounded font-medium border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Reset
                </Link>
              )}
            </div>
          </form>
        </Card>

        {/* Inventory Data Table */}
        <Card className="bg-zinc-950 border-zinc-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-950/50 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-4">Products</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Reserved</th>
                  <th className="p-4">Threshold</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 divide-opacity-40">
                {processedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      No matching inventory records found.
                    </td>
                  </tr>
                ) : (
                  processedProducts.map((p) => {
                    const isLowStock = p.stock <= p.threshold
                    return (
                      <tr key={p.id} className="hover:bg-zinc-900/10 transition-colors">
                        {/* Product info */}
                        <td className="p-4 min-w-[200px]">
                          <div className="font-semibold text-zinc-200">{p.name}</div>
                          <div className="text-[10px] text-zinc-550 font-mono tracking-wider mt-0.5">{p.sku}</div>
                        </td>

                        {/* Available Stock */}
                        <td className="p-4 font-semibold font-mono">
                          <span className={isLowStock ? "text-red-500 font-bold" : "text-zinc-300"}>
                            {p.stock}
                          </span>
                        </td>

                        {/* Reserved Stock */}
                        <td className="p-4 text-zinc-400 font-mono">
                          {p.reserved}
                        </td>

                        {/* Min Stock Level Threshold */}
                        <td className="p-4 text-zinc-500 font-mono">
                          {p.threshold}
                        </td>

                        {/* Supplier */}
                        <td className="p-4 text-zinc-400">
                          {p.supplier?.name || "Unassigned"}
                        </td>

                        {/* Status Badge */}
                        <td className="p-4 text-right">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${p.statusColor}`}
                          >
                            {p.statusLabel}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
