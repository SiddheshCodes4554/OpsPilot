import React from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import { prisma } from "@/lib/prisma"
import { DashboardClient } from "@/components/dashboard/DashboardClient"

export default async function DashboardPage() {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  // 1. Fetch initial Orders Today
  const todayOrders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startOfToday,
      },
    },
    select: {
      totalAmount: true,
    },
  })
  const ordersCount = todayOrders.length
  const ordersTotal = todayOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)

  // 2. Fetch initial Pending POs
  const pendingPos = await prisma.purchaseOrder.findMany({
    where: {
      status: "PENDING",
    },
    select: {
      totalAmount: true,
    },
  })
  const posCount = pendingPos.length
  const posTotal = pendingPos.reduce((sum, po) => sum + Number(po.totalAmount), 0)

  // 3. Fetch initial Inventory Health counts
  const totalInventoryItems = await prisma.inventory.count()
  const lowStockCount = await prisma.inventory.count({
    where: {
      quantity: {
        lte: prisma.inventory.fields.minStockLevel,
      },
    },
  })

  // 4. Fetch initial Business Snapshot metrics
  const [dbProductCount, dbSupplierCount, dbOrderCount, dbAllOrders] = await Promise.all([
    prisma.product.count(),
    prisma.supplier.count(),
    prisma.order.count(),
    prisma.order.findMany({ select: { totalAmount: true } }),
  ])
  const totalSalesVolume = dbAllOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)

  // 5. Fetch initial Agent Status
  const latestLog = await prisma.agentLog.findFirst({
    orderBy: { createdAt: "desc" },
  })
  let agentStatus = "IDLE"
  let statusMessage = "AI Agents are waiting for incoming workflows."
  if (latestLog) {
    if (latestLog.level === "ERROR") {
      agentStatus = "ERROR"
      statusMessage = `Error: ${latestLog.message}`
    } else if (latestLog.message.includes("Initiated")) {
      agentStatus = "BUSY"
      statusMessage = latestLog.message
    } else {
      agentStatus = "IDLE"
      statusMessage = `Last action: ${latestLog.action}`
    }
  }

  // 6. Fetch initial Workflow Timeline logs
  const recentLogs = await prisma.agentLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  // 7. Fetch initial notifications
  const recentNotifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  // 8. Fetch initial Low Stock items list
  const lowStockItems = await prisma.product.findMany({
    where: {
      inventory: {
        quantity: {
          lte: prisma.inventory.fields.minStockLevel,
        },
      },
    },
    include: {
      inventory: true,
    },
    take: 5,
  })

  // 9. Fetch active AI agent users
  const activeAgents = await prisma.user.findMany({
    where: { role: "AI_AGENT" },
    select: { id: true, name: true, email: true },
  })

  // Assemble the hydrated initialData payload for Next.js Client Component
  const initialData = {
    ordersToday: {
      count: ordersCount,
      totalAmount: ordersTotal,
    },
    pendingPurchaseOrders: {
      count: posCount,
      totalAmount: posTotal,
    },
    inventoryHealth: {
      totalCount: totalInventoryItems,
      lowStockCount,
    },
    businessSnapshot: {
      productCount: dbProductCount,
      supplierCount: dbSupplierCount,
      orderCount: dbOrderCount,
      totalSales: totalSalesVolume,
    },
    agentStatus: {
      status: agentStatus,
      message: statusMessage,
      lastUpdatedAt: latestLog?.createdAt.toISOString() || new Date().toISOString(),
    },
    workflowTimeline: recentLogs.map((log) => ({
      id: log.id,
      action: log.action,
      level: log.level,
      message: log.message,
      createdAt: log.createdAt.toISOString(),
    })),
    notifications: recentNotifications.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
    })),
    lowStockItems: lowStockItems.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      quantity: item.inventory?.quantity ?? 0,
      minStockLevel: item.inventory?.minStockLevel ?? 10,
    })),
    activeAgents,
  }

  return (
    <PageContainer
      title="Workspace Operations"
      description="Autonomous workforce triggers, active inventory telemetry, and real-time transaction tracking."
    >
      <DashboardClient initialData={initialData} />
    </PageContainer>
  )
}
