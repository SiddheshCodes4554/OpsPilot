"use client"

import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"

export interface ApprovalItem {
  id: string
  purchaseOrderId: string | null
  orderId: string | null
  status: "PENDING" | "APPROVED" | "REJECTED"
  comments: string | null
  createdAt: string
  purchaseOrder?: {
    id: string
    totalAmount: number
    status: string
    supplier: {
      name: string
    }
  } | null
  order?: {
    id: string
    totalAmount: number
    status: string
    customer: {
      name: string
    }
  } | null
}

interface ApprovalsClientProps {
  initialApprovals: ApprovalItem[]
}

export function ApprovalsClient({ initialApprovals }: ApprovalsClientProps) {
  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | null>(null)

  // Poll approvals list from server every 3 seconds
  const { data: approvals, refetch } = useQuery<ApprovalItem[]>({
    queryKey: ["approvals"],
    queryFn: async () => {
      const res = await fetch("/api/approvals")
      const json = await res.json()
      if (json.status === "error") {
        throw new Error(json.message || "Failed to fetch approvals")
      }
      return json.data
    },
    initialData: initialApprovals,
    refetchInterval: 3000,
  })

  // Filter only pending approvals to show in the center
  const pendingApprovals = (approvals || []).filter((app) => app.status === "PENDING")

  const handleResolve = async (approvalId: string, action: "APPROVE" | "REJECT") => {
    setResolvingId(approvalId)
    setActionType(action)

    try {
      const res = await fetch("/api/approvals/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, action }),
      })

      const json = await res.json()
      if (json.status === "error") {
        throw new Error(json.message || "Failed to resolve approval.")
      }

      // Trigger immediate TanStack Query refetch to clear resolved card
      await refetch()
    } catch (error) {
      console.error("[ResolveApproval] Error:", error)
      alert(error instanceof Error ? error.message : String(error))
    } finally {
      setResolvingId(null)
      setActionType(null)
    }
  }

  return (
    <div className="space-y-6 text-zinc-50 font-sans">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-400">
          Pending Request Queue ({pendingApprovals.length})
        </h2>
        <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live queue polling...
        </div>
      </div>

      {pendingApprovals.length === 0 ? (
        <Card className="bg-zinc-950 border-zinc-900 p-8 text-center text-zinc-500 italic text-xs">
          Great job! No pending purchase order approvals in the queue.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pendingApprovals.map((app) => {
            const isProcessing = resolvingId === app.id
            const isPO = !!app.purchaseOrder
            const refId = isPO
              ? `PO-${app.purchaseOrder?.id.substring(0, 8).toUpperCase()}`
              : `ORD-${app.order?.id.substring(0, 8).toUpperCase()}`

            const entityName = isPO
              ? app.purchaseOrder?.supplier.name
              : app.order?.customer.name

            const totalAmount = isPO
              ? app.purchaseOrder?.totalAmount ?? 0
              : app.order?.totalAmount ?? 0

            return (
              <Card
                key={app.id}
                className="bg-zinc-900/40 border-zinc-800 hover:border-zinc-700/60 p-5 flex flex-col justify-between gap-5 transition-all duration-200"
              >
                {/* Header */}
                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs font-semibold text-zinc-400">
                      {refId}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-900/30">
                      pending
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-zinc-200 truncate">{entityName}</h3>
                </div>

                {/* Info block */}
                <div className="bg-zinc-950 rounded border border-zinc-900/80 p-3 space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Reason:</span>
                    <span className="text-zinc-300 font-medium text-right max-w-[180px] truncate">
                      {app.comments || "Exceeds standard limits ($1,000.00)"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total Price:</span>
                    <span className="text-zinc-200 font-semibold font-mono text-right">
                      ${totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolve(app.id, "REJECT")}
                    disabled={isProcessing}
                    className={`flex-1 py-1.5 rounded text-xs font-semibold border transition-all duration-200 ${
                      isProcessing
                        ? "bg-zinc-950 border-zinc-900 text-zinc-600 cursor-not-allowed"
                        : "border-red-900/50 bg-red-950/10 text-red-400 hover:bg-red-950/30 hover:border-red-800/60 active:scale-[0.98]"
                    }`}
                  >
                    {isProcessing && actionType === "REJECT" ? "Rejecting..." : "Reject"}
                  </button>

                  <button
                    onClick={() => handleResolve(app.id, "APPROVE")}
                    disabled={isProcessing}
                    className={`flex-1 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${
                      isProcessing
                        ? "bg-zinc-950 text-zinc-600 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md active:scale-[0.98]"
                    }`}
                  >
                    {isProcessing && actionType === "APPROVE" ? "Approving..." : "Approve"}
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
