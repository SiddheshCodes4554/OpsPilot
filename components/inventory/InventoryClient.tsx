"use client"

import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"

export interface InventoryItem {
  id: string
  productId: string
  quantity: number
  location: string | null
  minStockLevel: number
  reserved: number
  productName: string
  productSku: string
  productPrice: number
  supplierName: string
  supplierId: string | null
}

interface SupplierItem {
  id: string
  name: string
}

interface InventoryClientProps {
  initialData: InventoryItem[]
  suppliersList: SupplierItem[]
}

export function InventoryClient({ initialData, suppliersList }: InventoryClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSupplierId, setSelectedSupplierId] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")

  // Poll server every 3 seconds to fetch live inventory data
  const { data: inventories } = useQuery<InventoryItem[]>({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await fetch("/api/inventory")
      const json = await res.json()
      if (json.status === "error") {
        throw new Error(json.message || "Failed to fetch inventory")
      }
      return json.data
    },
    initialData,
    refetchInterval: 3000,
  })

  // Health status helper
  const getHealthBadge = (stock: number, threshold: number) => {
    if (stock === 0) {
      return {
        label: "Out of Stock",
        color: "text-red-400 bg-red-950/30 border-red-900/50",
      }
    }
    if (stock <= threshold) {
      return {
        label: "Low Stock",
        color: "text-amber-400 bg-amber-950/30 border-amber-900/50",
      }
    }
    return {
      label: "In Stock",
      color: "text-emerald-400 bg-emerald-950/30 border-emerald-900/50",
    }
  }

  // Filter products based on search inputs and selectors
  const filteredInventory = (inventories || []).filter((item) => {
    // 1. Search Query Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = item.productName.toLowerCase().includes(query)
      const matchesSku = item.productSku.toLowerCase().includes(query)
      if (!matchesName && !matchesSku) return false
    }

    // 2. Supplier Filter
    if (selectedSupplierId && item.supplierId !== selectedSupplierId) {
      return false
    }

    // 3. Status Filter
    if (selectedStatus) {
      const { label } = getHealthBadge(item.quantity, item.minStockLevel)
      if (selectedStatus === "in_stock" && label !== "In Stock") return false
      if (selectedStatus === "low_stock" && label !== "Low Stock") return false
      if (selectedStatus === "out_of_stock" && label !== "Out of Stock") return false
    }

    return true
  })

  return (
    <div className="space-y-6 text-zinc-50 font-sans">
      {/* Search & Filter Controls */}
      <Card className="bg-zinc-950 border-zinc-900 p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Search Input */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name or SKU..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          {/* Supplier Filter */}
          <div className="w-[180px]">
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-zinc-700 cursor-pointer"
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
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-zinc-300 focus:outline-none focus:border-zinc-700 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          <div className="text-[10px] text-zinc-500 ml-auto flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Polling database live...
          </div>
        </div>
      </Card>

      {/* Grid of items */}
      <Card className="bg-zinc-950 border-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-950/60 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-4">Product</th>
                <th className="p-4">SKU</th>
                <th className="p-4 text-right">Current Stock</th>
                <th className="p-4 text-right">Reserved</th>
                <th className="p-4 text-right">Threshold</th>
                <th className="p-4">Supplier</th>
                <th className="p-4 text-center">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500 italic">
                    No products match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const health = getHealthBadge(item.quantity, item.minStockLevel)
                  return (
                    <tr key={item.id} className="hover:bg-zinc-900/20 transition-colors">
                      <td className="p-4 font-semibold text-zinc-200">{item.productName}</td>
                      <td className="p-4 font-mono text-zinc-400">{item.productSku}</td>
                      <td className="p-4 text-right font-medium text-zinc-300">{item.quantity}</td>
                      <td className="p-4 text-right font-medium text-zinc-500">
                        {item.reserved > 0 ? (
                          <span className="text-amber-400 bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-900/30">
                            {item.reserved}
                          </span>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="p-4 text-right font-medium text-zinc-500">{item.minStockLevel}</td>
                      <td className="p-4 text-zinc-400">{item.supplierName}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${health.color}`}
                        >
                          {health.label}
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
  )
}
