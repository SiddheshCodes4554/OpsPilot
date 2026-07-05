import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    // 1. Orders Today
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

    // 2. Pending Purchase Orders
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

    // 3. Inventory Health & Low Stock Count
    const totalInventoryItems = await prisma.inventory.count()
    const lowStockCount = await prisma.inventory.count({
      where: {
        quantity: {
          lte: prisma.inventory.fields.minStockLevel,
        },
      },
    })

    // 4. Business Snapshot
    const [dbProductCount, dbSupplierCount, dbOrderCount, dbAllOrders] = await Promise.all([
      prisma.product.count(),
      prisma.supplier.count(),
      prisma.order.count(),
      prisma.order.findMany({ select: { totalAmount: true } }),
    ])
    const totalSalesVolume = dbAllOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)

    // 5. Agent Status calculation from Agent Logs
    const latestLog = await prisma.agentLog.findFirst({
      orderBy: { createdAt: "desc" },
    })

    let agentStatus = "IDLE"
    let statusMessage = "AI Agents are waiting for incoming workflows."
    if (latestLog) {
      const logAgeMs = Date.now() - new Date(latestLog.createdAt).getTime()
      if (latestLog.level === "ERROR" && logAgeMs < 120000) {
        // Error in last 2 minutes
        agentStatus = "ERROR"
        statusMessage = `Error: ${latestLog.message}`
      } else if (latestLog.message.includes("Initiated") && logAgeMs < 30000) {
        // Running in last 30 seconds
        agentStatus = "BUSY"
        statusMessage = latestLog.message
      } else {
        agentStatus = "IDLE"
        statusMessage = `Last action: ${latestLog.action} (${Math.round(logAgeMs / 1000)}s ago)`
      }
    }

    // 6. Workflow Timeline (combining latest 10 Agent Logs)
    const recentLogs = await prisma.agentLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    // 7. Recent Notifications
    const recentNotifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    })

    // 8. Low Stock Items list
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

    // 9. Active AI Agent Users
    const activeAgents = await prisma.user.findMany({
      where: { role: "AI_AGENT" },
      select: { id: true, name: true, email: true },
    })

    return NextResponse.json({
      status: "success",
      data: {
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
          lastUpdatedAt: latestLog?.createdAt || new Date(),
        },
        workflowTimeline: recentLogs,
        notifications: recentNotifications,
        lowStockItems: lowStockItems.map((item) => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: item.inventory?.quantity ?? 0,
          minStockLevel: item.inventory?.minStockLevel ?? 10,
        })),
        activeAgents,
      },
    })
  } catch (error) {
    console.error("[GET /api/dashboard/metrics] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
