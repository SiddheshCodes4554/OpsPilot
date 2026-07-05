import React from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import { Section } from "@/components/layout/Section"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

// Import modular dashboard widgets
import { OrdersToday } from "@/features/dashboard/components/OrdersToday"
import { InventoryHealth } from "@/features/dashboard/components/InventoryHealth"
import { LowStockItems } from "@/features/dashboard/components/LowStockItems"
import { PendingPurchaseOrders } from "@/features/dashboard/components/PendingPurchaseOrders"
import { RecentActivity } from "@/features/dashboard/components/RecentActivity"
import { BusinessSnapshot } from "@/features/dashboard/components/BusinessSnapshot"

export default async function DashboardPage() {
  // Fetch active AI agents for the workspace listing
  const activeAgents = await prisma.user.findMany({
    where: { role: "AI_AGENT" },
    select: { id: true, name: true, email: true },
  })

  return (
    <PageContainer
      title="Workspace Operations"
      description="Autonomous workforce triggers, active inventory telemetry, and real-time transaction tracking."
    >
      {/* KPI Stats Grid */}
      <Section title="Operational Metrics" description="Real-time performance metrics and procurement tracking.">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <OrdersToday />
          <PendingPurchaseOrders />
          <InventoryHealth />
          <BusinessSnapshot />
        </div>
      </Section>

      {/* Workspace Widgets Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Recent activity and system notifications */}
        <div className="lg:col-span-1">
          <Section title="Operational Activity" description="Latest traces and logs.">
            <RecentActivity />
          </Section>
        </div>

        {/* Column 2: Low Stock alerts */}
        <div className="lg:col-span-1">
          <Section title="Inventory Thresholds" description="Items requiring attention.">
            <LowStockItems />
          </Section>
        </div>

        {/* Column 3: Active AI agents */}
        <div className="lg:col-span-1">
          <Section title="AI Workforce" description="Active agent executors.">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Workspace Agents</CardTitle>
                <CardDescription>AI user profiles active in this tenant</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeAgents.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">No agents active.</p>
                ) : (
                  activeAgents.map((agent: { id: string; name: string | null; email: string }) => (
                    <div
                      key={agent.id}
                      className="p-3 rounded border border-zinc-900 bg-zinc-950/30 text-xs space-y-1"
                    >
                      <div className="font-semibold text-zinc-200">{agent.name}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{agent.email}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </Section>
        </div>
      </div>
    </PageContainer>
  )
}
