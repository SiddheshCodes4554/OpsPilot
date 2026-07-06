"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import {
  Plus,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  TrendingUp,
  Search,
  X,
  Loader2,
  AlertTriangle,
  Info,
} from "lucide-react"


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PoItemDetail {
  id: string
  productId: string
  productSku: string
  productName: string
  quantity: number
  unitPrice: number
}

export interface PurchaseOrderDetail {
  id: string
  supplierId: string
  supplierName: string
  status: "DRAFT" | "PENDING" | "APPROVED" | "ORDERED" | "DELIVERED" | "RECEIVED" | "REJECTED"
  totalAmount: number
  eta: string | null
  createdAt: string
  items: PoItemDetail[]
}

interface SupplierItem {
  id: string;
  name: string;
}

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  price: number;
}

interface ProcurementClientProps {
  initialOrders: PurchaseOrderDetail[]
  suppliersList: SupplierItem[]
  productsList: ProductItem[]
}

// Helper to format currency to Indian Rupees
const formatINR = (val: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val)
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// ---------------------------------------------------------------------------
// Create Purchase Order Modal
// ---------------------------------------------------------------------------

interface CreateModalProps {
  suppliersList: SupplierItem[]
  productsList: ProductItem[]
  onClose: () => void
  onSave: (data: any) => Promise<void>
  isSaving: boolean
}

function CreatePurchaseOrderModal({ suppliersList, productsList, onClose, onSave, isSaving }: CreateModalProps) {
  const [supplierId, setSupplierId] = useState("")
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState(10)
  const [unitPrice, setUnitPrice] = useState(0)
  const [eta, setEta] = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  const handleProductChange = (id: string) => {
    setProductId(id)
    const prod = productsList.find((p) => p.id === id)
    if (prod) {
      // wholesale unit price defaults to 70% of standard retail catalog price
      setUnitPrice(Number((prod.price * 0.7).toFixed(2)))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")

    if (!supplierId) return setErrorMsg("Please select a supplier.")
    if (!productId) return setErrorMsg("Please select a product.")
    if (quantity <= 0) return setErrorMsg("Quantity must be at least 1.")
    if (unitPrice < 0) return setErrorMsg("Wholesale unit price cannot be negative.")

    try {
      await onSave({
        supplierId,
        status: "PENDING",
        eta: eta || null,
        items: [
          {
            productId,
            quantity,
            unitPrice,
          },
        ],
      })
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create Purchase Order.")
    }
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div style={{
        width: "100%", maxWidth: "500px",
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
            Create Replenishment Purchase Order
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

          {/* Supplier */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
              Supplier
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box", height: "36px",
                backgroundColor: "#09090b", border: "1px solid #27272a",
                borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: "#f4f4f5",
                outline: "none", cursor: "pointer",
              }}
            >
              <option value="">Select Supplier Partner</option>
              {suppliersList.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Product */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
              Product Catalog Item
            </label>
            <select
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box", height: "36px",
                backgroundColor: "#09090b", border: "1px solid #27272a",
                borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: "#f4f4f5",
                outline: "none", cursor: "pointer",
              }}
            >
              <option value="">Select Catalog Item</option>
              {productsList.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {/* Quantity */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
                Quantity
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={1}
                placeholder="10"
                style={{
                  width: "100%", boxSizing: "border-box", height: "36px",
                  backgroundColor: "#09090b", border: "1px solid #27272a",
                  borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: "#f4f4f5",
                  outline: "none",
                }}
              />
            </div>

            {/* Wholesale Unit Price */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
                Wholesale Unit Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={unitPrice || ""}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                placeholder="0.00"
                style={{
                  width: "100%", boxSizing: "border-box", height: "36px",
                  backgroundColor: "#09090b", border: "1px solid #27272a",
                  borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: "#f4f4f5",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* ETA */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
              Estimated ETA
            </label>
            <input
              type="date"
              value={eta}
              onChange={(e) => setEta(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box", height: "36px",
                backgroundColor: "#09090b", border: "1px solid #27272a",
                borderRadius: "6px", padding: "0 10px", fontSize: "12px", color: "#71717a",
                outline: "none", cursor: "pointer",
              }}
            />
          </div>

          {/* Estimated Total */}
          <div style={{ padding: "10px", borderRadius: "6px", backgroundColor: "#18181b40", border: "1px solid #27272a40", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
            <span style={{ color: "#71717a", fontWeight: 550 }}>Estimated Total cost:</span>
            <span style={{ color: "#10B981", fontWeight: 700, fontSize: "14px" }}>
              {formatINR(quantity * unitPrice)}
            </span>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "6px" }}>
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
              Create PO
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main ProcurementClient Component
// ---------------------------------------------------------------------------

export function ProcurementClient({ initialOrders, suppliersList, productsList }: ProcurementClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const queryClient = useQueryClient()

  // Poll purchase orders list every 3 seconds
  const { data: purchaseOrders = [] } = useQuery<PurchaseOrderDetail[]>({
    queryKey: ["purchaseOrders"],
    queryFn: async () => {
      const res = await fetch("/api/purchase-orders")
      const json = await res.json()
      if (json.status === "error") throw new Error(json.message)
      return json.data.map((po: any) => ({
        id: po.id,
        supplierId: po.supplierId,
        supplierName: po.supplier.name,
        status: po.status,
        totalAmount: Number(po.totalAmount),
        eta: po.eta,
        createdAt: po.createdAt,
        items: po.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productSku: item.product.sku,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        })),
      }))
    },
    initialData: initialOrders,
    refetchInterval: 3000,
  })

  // Create PO Mutation via POST
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok || json.status === "error") throw new Error(json.message || "Failed to create PO")
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] })
    },
    onError: (err) => {
      alert(err.message)
    },
  })

  // Update PO Status Mutation via POST (with id)
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PurchaseOrderDetail["status"] }) => {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      const json = await res.json()
      if (!res.ok || json.status === "error") throw new Error(json.message || "Failed to update PO status")
      return json.data
    },
    onMutate: ({ id }) => {
      setUpdatingId(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] })
      queryClient.invalidateQueries({ queryKey: ["inventory"] }) // Refresh inventory levels instantly!
    },
    onError: (err) => {
      alert(err.message)
    },
    onSettled: () => {
      setUpdatingId(null)
    },
  })

  const handleStatusChange = (id: string, status: PurchaseOrderDetail["status"]) => {
    statusMutation.mutate({ id, status })
  }

  // Filter purchase orders
  const filteredOrders = purchaseOrders.filter((order) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesId = order.id.toLowerCase().includes(q)
      const matchesSupplier = order.supplierName.toLowerCase().includes(q)
      const matchesItem = order.items.some((item) => item.productName.toLowerCase().includes(q) || item.productSku.toLowerCase().includes(q))
      if (!matchesId && !matchesSupplier && !matchesItem) return false
    }
    if (selectedStatus && order.status !== selectedStatus) return false
    return true
  })

  const getStatusBadgeStyle = (status: PurchaseOrderDetail["status"]) => {
    switch (status) {
      case "DRAFT": return { bg: "#52525b15", color: "#a1a1aa", icon: FileText }
      case "PENDING": return { bg: "#F59E0B15", color: "#F59E0B", icon: Clock }
      case "APPROVED": return { bg: "#6366F115", color: "#6366F1", icon: CheckCircle2 }
      case "ORDERED": return { bg: "#3B82F615", color: "#3B82F6", icon: Truck }
      case "DELIVERED":
      case "RECEIVED": return { bg: "#10B98115", color: "#10B981", icon: CheckCircle2 }
      case "REJECTED": return { bg: "#EF444415", color: "#EF4444", icon: XCircle }
      default: return { bg: "#52525b15", color: "#a1a1aa", icon: Info }
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: "#f4f4f5", fontFamily: "inherit" }}>
      
      {/* Search & Filters */}
      <Card style={{ backgroundColor: "#09090b", border: "1px solid #18181b", padding: "16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", fontSize: "12px" }}>
          
          {/* Search */}
          <div style={{ flex: 1, minWidth: "250px", display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", padding: "0 12px", height: "36px" }}>
            <Search size={13} color="#52525b" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by PO Reference, Supplier, or Product..."
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#d4d4d8", fontSize: "12px" }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ width: "160px", height: "36px", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", padding: "0 10px", color: "#d4d4d8", outline: "none", cursor: "pointer" }}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="ORDERED">Ordered</option>
            <option value="DELIVERED">Delivered</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Create PO button */}
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "0 16px", height: "36px", borderRadius: "8px",
              background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
              border: "none", cursor: "pointer",
              fontSize: "12px", fontWeight: 700, color: "#fff",
              marginLeft: "auto",
            }}
          >
            <Plus size={13} />
            Create PO
          </button>
        </div>
      </Card>

      {/* PO Table */}
      <Card style={{ backgroundColor: "#09090b", border: "1px solid #18181b", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #18181b", backgroundColor: "#0c0c0e", color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", fontSize: "10px" }}>
                <th style={{ padding: "12px 16px" }}>PO Reference</th>
                <th style={{ padding: "12px 16px" }}>Supplier</th>
                <th style={{ padding: "12px 16px" }}>Replenished Products</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Wholesale Cost</th>
                <th style={{ padding: "12px 16px" }}>Created Date</th>
                <th style={{ padding: "12px 16px" }}>Estimated ETA</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Status</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Change Status</th>
              </tr>
            </thead>
            <tbody style={{ color: "#d4d4d8" }}>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: "#52525b", fontStyle: "italic" }}>
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const styleInfo = getStatusBadgeStyle(order.status)
                  const StatusIcon = styleInfo.icon
                  const isUpdating = updatingId === order.id

                  return (
                    <tr
                      key={order.id}
                      style={{ borderBottom: "1px solid #18181b", transition: "background-color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#131315")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {/* PO Reference */}
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 600, color: "#a1a1aa" }}>
                        PO-{order.id.substring(0, 8).toUpperCase()}
                      </td>

                      {/* Supplier */}
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "#f4f4f5" }}>
                        {order.supplierName}
                      </td>

                      {/* Product items */}
                      <td style={{ padding: "12px 16px" }}>
                        {order.items.map((item, idx) => (
                          <div key={idx} style={{ fontSize: "12px", color: "#a1a1aa" }}>
                            <strong style={{ color: "#f4f4f5" }}>{item.quantity}x</strong> {item.productName}{" "}
                            <span style={{ fontSize: "10px", color: "#52525b", fontFamily: "monospace" }}>({item.productSku})</span>
                          </div>
                        ))}
                      </td>

                      {/* Total cost */}
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#e4e4e7" }}>
                        {formatINR(order.totalAmount)}
                      </td>

                      {/* Date */}
                      <td style={{ padding: "12px 16px", color: "#71717a", fontFamily: "monospace" }}>
                        {formatDate(order.createdAt)}
                      </td>

                      {/* ETA */}
                      <td style={{ padding: "12px 16px", color: "#71717a", fontFamily: "monospace" }}>
                        {order.eta ? formatDate(order.eta) : <span style={{ color: "#3f3f46" }}>—</span>}
                      </td>

                      {/* Status badge */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          padding: "2px 8px", borderRadius: "4px",
                          fontSize: "10px", fontWeight: 700,
                          backgroundColor: styleInfo.bg, color: styleInfo.color,
                          border: `1px solid ${styleInfo.color}30`,
                          textTransform: "uppercase", letterSpacing: "0.3px",
                        }}>
                          <StatusIcon size={9} />
                          {order.status.toLowerCase()}
                        </span>
                      </td>

                      {/* Status Selector */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <select
                          value={order.status}
                          disabled={isUpdating}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as PurchaseOrderDetail["status"])}
                          style={{
                            height: "28px", backgroundColor: "#18181b", border: "1px solid #27272a",
                            borderRadius: "6px", padding: "0 6px", fontSize: "11px", color: "#d4d4d8",
                            outline: "none", cursor: isUpdating ? "not-allowed" : "pointer"
                          }}
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="PENDING">Pending</option>
                          <option value="APPROVED">Approved</option>
                          <option value="ORDERED">Ordered</option>
                          <option value="DELIVERED">Delivered</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
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
        <CreatePurchaseOrderModal
          suppliersList={suppliersList}
          productsList={productsList}
          onClose={() => setShowModal(false)}
          onSave={async (payload) => {
            await createMutation.mutateAsync(payload)
          }}
          isSaving={createMutation.isPending}
        />
      )}

      {/* Styles */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
