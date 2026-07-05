import React from "react"
import Link from "next/link"
import { PageContainer } from "@/components/layout/PageContainer"
import { Card } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

interface ProcurementPageProps {
  searchParams: Promise<{
    status?: string
  }>
}

export default async function ProcurementPage({ searchParams }: ProcurementPageProps) {
  const params = await searchParams
  const statusFilter = params.status || ""

  // Fetch all purchase orders with supplier details from Neon database
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    include: {
      supplier: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Filter purchase orders based on status query param
  const filteredOrders = purchaseOrders.filter((order) => {
    if (statusFilter && order.status !== statusFilter) {
      return false
    }
    return true
  })

  // Status color helper
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "text-zinc-400 bg-zinc-900 border-zinc-800"
      case "PENDING":
        return "text-amber-400 bg-amber-950/30 border-amber-900/50"
      case "APPROVED":
        return "text-indigo-400 bg-indigo-950/30 border-indigo-900/50"
      case "ORDERED":
        return "text-blue-400 bg-blue-950/30 border-blue-900/50"
      case "DELIVERED":
      case "RECEIVED":
        return "text-emerald-400 bg-emerald-950/30 border-emerald-900/50"
      case "REJECTED":
        return "text-red-400 bg-red-950/30 border-red-900/50"
      default:
        return "text-zinc-400 bg-zinc-900 border-zinc-800"
    }
  }

  return (
    <PageContainer
      title="Procurement Orders"
      description="Procure inventory and manage incoming shipments from connected suppliers."
    >
      <div className="space-y-6">
        {/* Filters Card */}
        <Card className="bg-zinc-950 border-zinc-900 p-4">
          <form method="GET" action="/procurement" className="flex flex-wrap items-center gap-4 text-xs">
            {/* Status Dropdown */}
            <div className="w-[180px]">
              <select
                name="status"
                defaultValue={statusFilter}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-zinc-350 focus:outline-none focus:border-zinc-700"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="ORDERED">Ordered</option>
                <option value="DELIVERED">Delivered</option>
              </select>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded font-medium bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition-colors"
              >
                Filter
              </button>
              {statusFilter && (
                <Link
                  href="/procurement"
                  className="px-3.5 py-1.5 rounded font-medium border border-zinc-800 bg-zinc-900 text-zinc-450 hover:text-zinc-200 transition-colors"
                >
                  Reset
                </Link>
              )}
            </div>
          </form>
        </Card>

        {/* Purchase Orders Table */}
        <Card className="bg-zinc-950 border-zinc-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-900 bg-zinc-950/50 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-4">PO Reference</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4">Estimated ETA</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 divide-opacity-40">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      No purchase orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const first8Id = order.id.substring(0, 8).toUpperCase()
                    return (
                      <tr key={order.id} className="hover:bg-zinc-900/10 transition-colors">
                        {/* PO ID Reference */}
                        <td className="p-4 font-mono font-medium text-zinc-300">
                          PO-{first8Id}
                        </td>

                        {/* Supplier */}
                        <td className="p-4 font-medium text-zinc-200">
                          {order.supplier.name}
                        </td>

                        {/* Total Amount */}
                        <td className="p-4 font-semibold font-mono text-zinc-300">
                          ${Number(order.totalAmount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        {/* Created Date */}
                        <td className="p-4 text-zinc-500 font-mono">
                          {order.createdAt.toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>

                        {/* Estimated ETA */}
                        <td className="p-4 text-zinc-450 font-mono">
                          {order.eta ? (
                            order.eta.toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          ) : (
                            <span className="text-zinc-650">—</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="p-4 text-right">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getStatusStyle(
                              order.status
                            )}`}
                          >
                            {order.status.toLowerCase()}
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
