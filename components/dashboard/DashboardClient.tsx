"use client"

import React from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Section } from "@/components/layout/Section"
import { ShoppingBag, AlertTriangle, Truck, Layers, Activity, Users } from "lucide-react"

interface DashboardMetrics {
  ordersToday: { count: number; totalAmount: number }
  pendingPurchaseOrders: { count: number; totalAmount: number }
  inventoryHealth: { totalCount: number; lowStockCount: number }
  businessSnapshot: { productCount: number; supplierCount: number; orderCount: number; totalSales: number }
  agentStatus: { status: string; message: string; lastUpdatedAt: string }
  workflowTimeline: { id: string; action: string; level: string; message: string; createdAt: string }[]
  notifications: { id: string; title: string; content: string; createdAt: string }[]
  lowStockItems: { id: string; name: string; sku: string; quantity: number; minStockLevel: number }[]
  activeAgents: { id: string; name: string | null; email: string }[]
}

interface DashboardClientProps {
  initialData: DashboardMetrics
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  // Poll metrics endpoint every 5 seconds
  const { data = initialData } = useQuery<DashboardMetrics>({
    queryKey: ["dashboardMetrics"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/metrics")
      const json = await res.json()
      if (json.status === "error") {
        throw new Error(json.message || "Failed to fetch dashboard metrics")
      }
      return json.data
    },
    initialData,
    refetchInterval: 5000,
  })

  // Agent Status styling helper
  const getAgentStatusBadge = (status: string) => {
    switch (status) {
      case "BUSY":
        return {
          label: "busy",
          color: "text-blue-400 bg-blue-950/30 border-blue-900/50 animate-pulse",
          dot: "bg-blue-500",
        }
      case "ERROR":
        return {
          label: "error",
          color: "text-red-400 bg-red-950/30 border-red-900/50",
          dot: "bg-red-500 animate-ping",
        }
      default: // IDLE
        return {
          label: "idle",
          color: "text-emerald-400 bg-emerald-950/30 border-emerald-900/50",
          dot: "bg-emerald-500",
        }
    }
  }

  const agentBadge = getAgentStatusBadge(data.agentStatus.status)

  return (
    <div className="space-y-6 text-zinc-50 font-sans">
      {/* 1. Operational KPI stats cards */}
      <Section title="Operational Metrics" description="Real-time performance metrics and procurement tracking.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Orders Today widget */}
          <Card hoverEffect>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xs font-semibold text-zinc-400">Orders Today</CardTitle>
                <CardDescription className="text-[9px] text-zinc-500">Sales volume generated today</CardDescription>
              </div>
              <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold tracking-tight text-zinc-100">
                ${data.ordersToday.totalAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 font-semibold">
                {data.ordersToday.count} {data.ordersToday.count === 1 ? "order" : "orders"} processed today
              </p>
            </CardContent>
          </Card>

          {/* Pending Purchase Orders widget */}
          <Card hoverEffect>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xs font-semibold text-zinc-400">Pending Refills</CardTitle>
                <CardDescription className="text-[9px] text-zinc-500">Purchase orders awaiting approvals</CardDescription>
              </div>
              <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                <Truck className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold tracking-tight text-zinc-100">
                ${data.pendingPurchaseOrders.totalAmount.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 font-semibold">
                {data.pendingPurchaseOrders.count} active procurement orders
              </p>
            </CardContent>
          </Card>

          {/* Inventory Health widget */}
          <Card hoverEffect>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xs font-semibold text-zinc-400">Inventory Health</CardTitle>
                <CardDescription className="text-[9px] text-zinc-500">Stock levels relative to threshold</CardDescription>
              </div>
              <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold tracking-tight text-zinc-100">
                {data.inventoryHealth.totalCount - data.inventoryHealth.lowStockCount} / {data.inventoryHealth.totalCount}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 font-semibold">
                {data.inventoryHealth.lowStockCount} items have low stock warnings
              </p>
            </CardContent>
          </Card>

          {/* Business Snapshot widget */}
          <Card hoverEffect>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xs font-semibold text-zinc-400">Total Revenue</CardTitle>
                <CardDescription className="text-[9px] text-zinc-500">Cumulative sales transaction volume</CardDescription>
              </div>
              <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                <Layers className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-2xl font-bold tracking-tight text-zinc-100">
                ${data.businessSnapshot.totalSales.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 font-semibold">
                {data.businessSnapshot.orderCount} total orders completed
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* 2. Workspace Status split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Agent Status & Workflow Timeline */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Section title="AI Workforce Status" description="Autonomous executors telemetry.">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-xs font-semibold text-zinc-300">Agent Status</CardTitle>
                  <CardDescription className="text-[9px] text-zinc-500">Real-time status calculated from agent logs</CardDescription>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${agentBadge.color}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${agentBadge.dot}`} />
                  {agentBadge.label}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded border border-zinc-900 bg-zinc-950/40 text-[10px] text-zinc-400 font-mono leading-relaxed break-words">
                  {data.agentStatus.message}
                </div>
                <div className="text-[9px] text-zinc-650 flex justify-between font-mono">
                  <span>Last status update:</span>
                  <span>{new Date(data.agentStatus.lastUpdatedAt).toLocaleTimeString()}</span>
                </div>
              </CardContent>
            </Card>
          </Section>

          <Section title="Workflow Timeline" description="Latest traces and logs.">
            <Card className="flex-1 min-h-[300px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-zinc-300 flex justify-between items-center">
                  <span>Activity Logs</span>
                  <Activity className="h-3.5 w-3.5 text-zinc-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 font-mono text-[9px] text-zinc-400 max-h-[350px] overflow-y-auto">
                {data.workflowTimeline.length === 0 ? (
                  <p className="text-center text-zinc-600 italic py-8">No agent traces logged yet.</p>
                ) : (
                  data.workflowTimeline.map((log) => {
                    const timeStr = new Date(log.createdAt).toLocaleTimeString()
                    return (
                      <div key={log.id} className="border-b border-zinc-900 pb-2 last:border-0 last:pb-0">
                        <div className="flex justify-between text-zinc-600">
                          <span>[{timeStr}] {log.action}</span>
                          <span className={log.level === "ERROR" ? "text-red-400" : "text-blue-400"}>
                            {log.level}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-300 leading-relaxed mt-0.5">{log.message}</p>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </Section>
        </div>

        {/* Column 2: Inventory Thresholds (Low Stock items list) */}
        <div className="lg:col-span-1">
          <Section title="Inventory Thresholds" description="Items requiring attention.">
            <Card className="h-full min-h-[400px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-zinc-300 flex justify-between items-center">
                  <span>Low Stock Warnings</span>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.lowStockItems.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic py-12 text-center">
                    All catalog items are healthy. No stock deficit alerts.
                  </p>
                ) : (
                  data.lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded border border-zinc-900 bg-zinc-950/20 text-xs flex justify-between items-center gap-4 hover:border-zinc-800 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-semibold text-zinc-200 truncate">{item.name}</div>
                        <div className="text-[9px] text-zinc-550 font-mono">{item.sku}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-red-400">{item.quantity}</span>
                        <span className="text-[9px] text-zinc-600 font-medium"> / {item.minStockLevel} max</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </Section>
        </div>

        {/* Column 3: AI Workforce list */}
        <div className="lg:col-span-1">
          <Section title="AI Workforce" description="Active agent executors.">
            <Card className="h-full min-h-[400px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-semibold text-zinc-300 flex justify-between items-center">
                  <span>Workspace Agents</span>
                  <Users className="h-3.5 w-3.5 text-zinc-500" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.activeAgents.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-12 text-center">No AI agent profiles found.</p>
                ) : (
                  data.activeAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className="p-3 rounded border border-zinc-900 bg-zinc-950/30 text-xs space-y-1 hover:border-zinc-800 transition-colors"
                    >
                      <div className="font-semibold text-zinc-200">{agent.name}</div>
                      <div className="text-[9px] text-zinc-500 truncate">{agent.email}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </Section>
        </div>
      </div>

      <div className="text-[9px] text-zinc-700 text-center font-mono pt-4 flex items-center justify-center gap-1">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Dashboard telemetry polling active (every 5s)
      </div>
    </div>
  )
}
