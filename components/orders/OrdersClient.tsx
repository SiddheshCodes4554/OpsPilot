"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  RotateCcw,
  Search,
  ChevronDown,
  ExternalLink,
  Loader2,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types & Config
// ---------------------------------------------------------------------------

export interface OrderItemDetail {
  id: string
  productId: string
  productSku: string
  productName: string
  quantity: number
  unitPrice: number
}

export interface OrderDetail {
  id: string
  customerId: string
  customerName: string
  customerEmail: string
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED"
  totalAmount: number
  createdAt: string
  items: OrderItemDetail[]
}

interface OrdersClientProps {
  initialData: OrderDetail[]
}

const STATUS_CONFIG: Record<
  OrderDetail["status"],
  { label: string; bg: string; color: string; icon: React.ElementType }
> = {
  PENDING: { label: "Pending", bg: "#F59E0B15", color: "#F59E0B", icon: Clock },
  PROCESSING: { label: "Processing", bg: "#3B82F615", color: "#3B82F6", icon: Loader2 },
  SHIPPED: { label: "Shipped", bg: "#8B5CF615", color: "#8B5CF6", icon: Truck },
  DELIVERED: { label: "Delivered", bg: "#10B98115", color: "#10B981", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", bg: "#71717a15", color: "#71717a", icon: XCircle },
  REFUNDED: { label: "Refunded", bg: "#EF444415", color: "#EF4444", icon: RotateCcw },
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
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function OrdersClient({ initialData }: OrdersClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const queryClient = useQueryClient()

  // Poll orders list from database every 3 seconds
  const { data: orders = [] } = useQuery<OrderDetail[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders")
      const json = await res.json()
      if (json.status === "error") throw new Error(json.message || "Failed to fetch orders")
      return json.data.map((order: any) => ({
        id: order.id,
        customerId: order.customerId,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt,
        items: order.items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          productSku: item.product.sku,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        })),
      }))
    },
    initialData,
    refetchInterval: 3000,
  })

  // Mutation to update status via PUT
  const statusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderDetail["status"] }) => {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      })
      const json = await res.json()
      if (!res.ok || json.status === "error") {
        throw new Error(json.message || "Failed to update order status")
      }
      return json.data
    },
    onMutate: ({ orderId }) => {
      setUpdatingId(orderId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] })
      queryClient.invalidateQueries({ queryKey: ["inventory"] }) // Also refresh inventory live!
    },
    onError: (err) => {
      alert(err.message)
    },
    onSettled: () => {
      setUpdatingId(null)
    },
  })

  const handleStatusChange = (orderId: string, status: OrderDetail["status"]) => {
    statusMutation.mutate({ orderId, status })
  }

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesId = order.id.toLowerCase().includes(q)
      const matchesCustomer = order.customerName.toLowerCase().includes(q) || order.customerEmail.toLowerCase().includes(q)
      const matchesItem = order.items.some((item) => item.productName.toLowerCase().includes(q) || item.productSku.toLowerCase().includes(q))
      if (!matchesId && !matchesCustomer && !matchesItem) return false
    }
    if (selectedStatus && order.status !== selectedStatus) return false
    return true
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", color: "#f4f4f5", fontFamily: "inherit" }}>
      
      {/* Filters & Controls */}
      <Card style={{ backgroundColor: "#09090b", border: "1px solid #18181b", padding: "16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", fontSize: "12px" }}>
          
          {/* Search */}
          <div style={{ flex: 1, minWidth: "250px", display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", padding: "0 12px", height: "36px" }}>
            <Search size={13} color="#52525b" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, Customer name, SKU, or Product..."
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
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REFUNDED">Refunded</option>
          </select>

          <div style={{ textTransform: "uppercase", fontSize: "9px", color: "#52525b", letterSpacing: "0.5px", fontWeight: 750, marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
            <span className="live-dot" style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10B981" }} />
            Active order sync
          </div>
        </div>
      </Card>

      {/* Orders Ledger */}
      <Card style={{ backgroundColor: "#09090b", border: "1px solid #18181b", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #18181b", backgroundColor: "#0c0c0e", color: "#71717a", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", fontSize: "10px" }}>
                <th style={{ padding: "12px 16px" }}>Order ID</th>
                <th style={{ padding: "12px 16px" }}>Customer</th>
                <th style={{ padding: "12px 16px" }}>Products Ordered</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Total Amount</th>
                <th style={{ padding: "12px 16px" }}>Order Date</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Status</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>Change Status</th>
              </tr>
            </thead>
            <tbody style={{ color: "#d4d4d8" }}>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "32px", textAlign: "center", color: "#52525b", fontStyle: "italic" }}>
                    No customer orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusInfo = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING
                  const StatusIcon = statusInfo.icon
                  const isUpdating = updatingId === order.id

                  return (
                    <tr
                      key={order.id}
                      style={{ borderBottom: "1px solid #18181b", transition: "background-color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#131315")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      {/* Order ID */}
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 600, color: "#3B82F6" }}>
                        ORD-{order.id.substring(0, 8).toUpperCase()}
                      </td>

                      {/* Customer */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: "#f4f4f5" }}>{order.customerName}</div>
                        <div style={{ fontSize: "11px", color: "#52525b" }}>{order.customerEmail}</div>
                      </td>

                      {/* Items Details */}
                      <td style={{ padding: "12px 16px" }}>
                        {order.items.map((item, idx) => (
                          <div key={idx} style={{ fontSize: "12px", color: "#a1a1aa" }}>
                            <strong style={{ color: "#f4f4f5" }}>{item.quantity}x</strong> {item.productName}{" "}
                            <span style={{ fontSize: "10px", color: "#52525b", fontFamily: "monospace" }}>({item.productSku})</span>
                          </div>
                        ))}
                      </td>

                      {/* Amount */}
                      <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#e4e4e7" }}>
                        {formatINR(order.totalAmount)}
                      </td>

                      {/* Date */}
                      <td style={{ padding: "12px 16px", color: "#71717a", fontFamily: "monospace" }}>
                        {formatDate(order.createdAt)}
                      </td>

                      {/* Status badge */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          padding: "2px 8px", borderRadius: "4px",
                          fontSize: "10px", fontWeight: 700,
                          backgroundColor: statusInfo.bg, color: statusInfo.color,
                          border: `1px solid ${statusInfo.color}30`,
                          textTransform: "uppercase", letterSpacing: "0.3px",
                        }}>
                          <StatusIcon size={9} className={order.status === "PROCESSING" ? "spin" : ""} />
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Status Action Selector */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <select
                          value={order.status}
                          disabled={isUpdating}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderDetail["status"])}
                          style={{
                            height: "28px", backgroundColor: "#18181b", border: "1px solid #27272a",
                            borderRadius: "6px", padding: "0 6px", fontSize: "11px", color: "#d4d4d8",
                            outline: "none", cursor: isUpdating ? "not-allowed" : "pointer"
                          }}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="PROCESSING">Processing</option>
                          <option value="SHIPPED">Shipped</option>
                          <option value="DELIVERED">Delivered</option>
                          <option value="CANCELLED">Cancelled</option>
                          <option value="REFUNDED">Refunded</option>
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

      {/* Global CSS for Animations */}
      <style>{`
        .live-dot {
          animation: pulse-dot 2s infinite ease-in-out;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .spin {
          animation: spin-ani 1.2s linear infinite;
        }
        @keyframes spin-ani {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
