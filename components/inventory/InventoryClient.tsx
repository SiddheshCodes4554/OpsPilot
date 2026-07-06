"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import {
  Plus,
  Edit2,
  X,
  Search,
  Loader2,
  Boxes,
  MapPin,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  description?: string | null
}

interface SupplierItem {
  id: string
  name: string
}

interface InventoryClientProps {
  initialData: InventoryItem[]
  suppliersList: SupplierItem[]
}

// ---------------------------------------------------------------------------
// Add/Edit Product Modal
// ---------------------------------------------------------------------------

interface ManageModalProps {
  item: InventoryItem | null // null for Add mode
  suppliersList: SupplierItem[]
  onClose: () => void
  onSave: (data: any) => Promise<void>
  isSaving: boolean
}

function ManageInventoryModal({ item, suppliersList, onClose, onSave, isSaving }: ManageModalProps) {
  const [sku, setSku]                     = useState(item?.productSku ?? "")
  const [name, setName]                   = useState(item?.productName ?? "")
  const [description, setDescription]     = useState(item?.description ?? "")
  const [price, setPrice]                 = useState(item?.productPrice ?? 0)
  const [quantity, setQuantity]           = useState(item?.quantity ?? 0)
  const [location, setLocation]           = useState(item?.location ?? "")
  const [minStockLevel, setMinStockLevel] = useState(item?.minStockLevel ?? 10)
  const [supplierId, setSupplierId]       = useState(item?.supplierId ?? "")
  const [errorMsg, setErrorMsg]           = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")

    if (!sku.trim())           return setErrorMsg("SKU is required.")
    if (!name.trim())          return setErrorMsg("Product Name is required.")
    if (price < 0)             return setErrorMsg("Price cannot be negative.")
    if (quantity < 0)          return setErrorMsg("Quantity cannot be negative.")
    if (minStockLevel < 1)     return setErrorMsg("Minimum stock level must be at least 1.")

    try {
      await onSave({
        sku: sku.trim(),
        name: name.trim(),
        description: description.trim() || null,
        price,
        quantity,
        location: location.trim() || null,
        minStockLevel,
        supplierId: supplierId || null,
      })
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save inventory item.")
    }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div style={{
        width: "100%", maxWidth: "560px",
        backgroundColor: "#0d0d0f",
        border: "1px solid #27272a",
        borderRadius: "12px",
        boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid #18181b",
        }}>
          <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#f4f4f5" }}>
            {item ? `Edit ${item.productName}` : "Add New Product & Stock"}
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#71717a", padding: "4px" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {errorMsg && (
            <div style={{
              padding: "10px 14px", borderRadius: "6px",
              backgroundColor: "#ef444415", border: "1px solid #ef444440",
              color: "#ef4444", fontSize: "12px", fontWeight: 500,
            }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* SKU */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
                SKU Code
              </label>
              <input
                type="text"
                placeholder="PROD-100"
                value={sku}
                onChange={e => setSku(e.target.value)}
                disabled={!!item} // Don't edit SKU for existing products
                style={{
                  width: "100%", boxSizing: "border-box", height: "36px",
                  backgroundColor: item ? "#18181b" : "#09090b", border: "1px solid #27272a",
                  borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: item ? "#71717a" : "#f4f4f5",
                  outline: "none",
                }}
              />
            </div>

            {/* Price */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
                Price (INR ₹)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={price || ""}
                onChange={e => setPrice(Number(e.target.value))}
                style={{
                  width: "100%", boxSizing: "border-box", height: "36px",
                  backgroundColor: "#09090b", border: "1px solid #27272a",
                  borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: "#f4f4f5",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
              Product Name
            </label>
            <input
              type="text"
              placeholder="e.g. Logitech MX Master 3S"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box", height: "36px",
                backgroundColor: "#09090b", border: "1px solid #27272a",
                borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: "#f4f4f5",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            {/* Quantity */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
                Stock Qty
              </label>
              <input
                type="number"
                placeholder="0"
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
                style={{
                  width: "100%", boxSizing: "border-box", height: "36px",
                  backgroundColor: "#09090b", border: "1px solid #27272a",
                  borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: "#f4f4f5",
                  outline: "none",
                }}
              />
            </div>

            {/* Threshold */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
                Min Threshold
              </label>
              <input
                type="number"
                placeholder="10"
                value={minStockLevel}
                onChange={e => setMinStockLevel(Number(e.target.value))}
                style={{
                  width: "100%", boxSizing: "border-box", height: "36px",
                  backgroundColor: "#09090b", border: "1px solid #27272a",
                  borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: "#f4f4f5",
                  outline: "none",
                }}
              />
            </div>

            {/* Location */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
                Location
              </label>
              <input
                type="text"
                placeholder="Aisle 4B"
                value={location}
                onChange={e => setLocation(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box", height: "36px",
                  backgroundColor: "#09090b", border: "1px solid #27272a",
                  borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: "#f4f4f5",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
            {/* Supplier */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
                Supplier Name
              </label>
              <select
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box", height: "36px",
                  backgroundColor: "#09090b", border: "1px solid #27272a",
                  borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: "#d4d4d8",
                  outline: "none", cursor: "pointer",
                }}
              >
                <option value="">No Supplier Assigned</option>
                {suppliersList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
              Description
            </label>
            <textarea
              placeholder="Product details, notes, etc."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              style={{
                width: "100%", boxSizing: "border-box",
                backgroundColor: "#09090b", border: "1px solid #27272a",
                borderRadius: "6px", padding: "10px", fontSize: "12px", color: "#f4f4f5",
                resize: "vertical", outline: "none", fontFamily: "inherit",
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0 14px", height: "36px", borderRadius: "6px",
                backgroundColor: "transparent", border: "1px solid #27272a",
                color: "#a1a1aa", fontSize: "12px", cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "0 18px", height: "36px", borderRadius: "6px",
                background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
                border: "none", color: "#fff", fontSize: "12px", fontWeight: 700,
                cursor: isSaving ? "not-allowed" : "pointer",
              }}
            >
              {isSaving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : null}
              {item ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main InventoryClient Component
// ---------------------------------------------------------------------------

export function InventoryClient({ initialData, suppliersList }: InventoryClientProps) {
  const [searchQuery, setSearchQuery]               = useState("")
  const [selectedSupplierId, setSelectedSupplierId] = useState("")
  const [selectedStatus, setSelectedStatus]         = useState("")
  const [modalItem, setModalItem]                   = useState<InventoryItem | null>(null)
  const [showModal, setShowModal]                   = useState(false)

  const queryClient = useQueryClient()

  // Poll database every 5 seconds for live updates
  const { data: inventories } = useQuery<InventoryItem[]>({
    queryKey: ["inventory"],
    queryFn: async () => {
      const res = await fetch("/api/inventory")
      const json = await res.json()
      if (json.status === "error") throw new Error(json.message || "Failed to fetch inventory")
      return json.data
    },
    initialData,
    refetchInterval: 5000,
  })

  // Mutation to create/update inventory via POST
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || json.status === "error") {
        throw new Error(json.message || json.errors ? Object.values(json.errors).join(", ") : "Failed to save product")
      }
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] })
    },
  })

  // Health status check
  const getHealthBadge = (stock: number, threshold: number) => {
    if (stock === 0) {
      return { label: "Out of Stock", color: "text-red-400 bg-red-950/20 border-red-900/40" }
    }
    if (stock <= threshold) {
      return { label: "Low Stock", color: "text-amber-400 bg-amber-950/20 border-amber-900/40" }
    }
    return { label: "In Stock", color: "text-emerald-400 bg-emerald-950/20 border-emerald-900/40" }
  }

  // Filter items
  const filteredInventory = (inventories || []).filter(item => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!item.productName.toLowerCase().includes(q) && !item.productSku.toLowerCase().includes(q)) {
        return false
      }
    }
    if (selectedSupplierId && item.supplierId !== selectedSupplierId) return false
    if (selectedStatus) {
      const { label } = getHealthBadge(item.quantity, item.minStockLevel)
      if (selectedStatus === "in_stock" && label !== "In Stock") return false
      if (selectedStatus === "low_stock" && label !== "Low Stock") return false
      if (selectedStatus === "out_of_stock" && label !== "Out of Stock") return false
    }
    return true
  })

  const openAddModal = () => {
    setModalItem(null)
    setShowModal(true)
  }

  const openEditModal = (item: InventoryItem) => {
    setModalItem(item)
    setShowModal(true)
  }

  // Helper to format currency to Indian Rupees
  const formatINR = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2
    }).format(val)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: "#f4f4f5", fontFamily: "inherit" }}>
      
      {/* Search & Filter Controls */}
      <Card style={{ backgroundColor: "#09090b", border: "1px solid #18181b", padding: "16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", fontSize: "12px" }}>
          
          {/* Search Input */}
          <div style={{ flex: 1, minWidth: "220px", display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", padding: "0 12px", height: "36px" }}>
            <Search size={13} color="#52525b" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by product name or SKU..."
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#d4d4d8", fontSize: "12px" }}
            />
          </div>

          {/* Supplier Filter */}
          <select
            value={selectedSupplierId}
            onChange={e => setSelectedSupplierId(e.target.value)}
            style={{ width: "170px", height: "36px", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", padding: "0 10px", color: "#d4d4d8", outline: "none", cursor: "pointer" }}
          >
            <option value="">All Suppliers</option>
            {suppliersList.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            style={{ width: "140px", height: "36px", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", padding: "0 10px", color: "#d4d4d8", outline: "none", cursor: "pointer" }}
          >
            <option value="">All Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>

          {/* Add Product Button */}
          <button
            onClick={openAddModal}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "0 16px", height: "36px", borderRadius: "8px",
              background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
              border: "none", cursor: "pointer",
              fontSize: "12px", fontWeight: 700, color: "#fff",
              marginLeft: "auto"
            }}
          >
            <Plus size={13} />
            Add Product
          </button>
        </div>
      </Card>

      {/* Grid of items */}
      <Card style={{ backgroundColor: "#09090b", border: "1px solid #18181b", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #18181b", backgroundColor: "#0c0c0e", color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", fontSize: "10px" }}>
                <th style={{ padding: "12px 16px" }}>Product Name</th>
                <th style={{ padding: "12px 16px" }}>SKU</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Price</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Current Stock</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Reserved</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Threshold</th>
                <th style={{ padding: "12px 16px" }}>Supplier</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Health</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody style={{ color: "#d4d4d8" }}>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "32px", textAlign: "center", color: "#52525b", fontStyle: "italic" }}>
                    No products match the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => {
                  const health = getHealthBadge(item.quantity, item.minStockLevel)
                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: "1px solid #18181b", transition: "background-color 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#131315")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#f4f4f5" }}>{item.productName}</td>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#a1a1aa" }}>{item.productSku}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, color: "#a1a1aa" }}>{formatINR(item.productPrice)}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500, color: "#f4f4f5" }}>{item.quantity}</td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        {item.reserved > 0 ? (
                          <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", backgroundColor: "#F59E0B20", color: "#F59E0B", border: "1px solid #F59E0B40" }}>
                            {item.reserved}
                          </span>
                        ) : (
                          <span style={{ color: "#52525b" }}>0</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: "#52525b" }}>{item.minStockLevel}</td>
                      <td style={{ padding: "12px 16px", color: "#a1a1aa" }}>{item.supplierName}</td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-block", padding: "2px 8px", borderRadius: "4px",
                          fontSize: "10px", fontWeight: 700, border: "1px solid transparent",
                          textTransform: "uppercase", letterSpacing: "0.3px",
                        }} className={health.color.split(" ").pop() ?? ""}>
                          {health.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <button
                          onClick={() => openEditModal(item)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "#52525b", padding: "4px", transition: "color 0.15s"
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = "#3B82F6")}
                          onMouseLeave={e => (e.currentTarget.style.color = "#52525b")}
                        >
                          <Edit2 size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal */}
      {showModal && (
        <ManageInventoryModal
          item={modalItem}
          suppliersList={suppliersList}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            await saveMutation.mutateAsync(data)
          }}
          isSaving={saveMutation.isPending}
        />
      )}

      {/* Global CSS Inject */}
      <style>{`
        .text-red-400 { color: #f87171 !important; background-color: rgba(127, 29, 29, 0.15) !important; border-color: rgba(127, 29, 29, 0.4) !important; }
        .text-amber-400 { color: #fbbf24 !important; background-color: rgba(120, 53, 4, 0.15) !important; border-color: rgba(120, 53, 4, 0.4) !important; }
        .text-emerald-400 { color: #34d399 !important; background-color: rgba(6, 78, 59, 0.15) !important; border-color: rgba(6, 78, 59, 0.4) !important; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
