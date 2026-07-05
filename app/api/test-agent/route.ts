import { NextResponse } from "next/server"
import { CustomerAgent } from "@/lib/agents/customer/CustomerAgent"
import { IAgent } from "@/lib/agents/shared/types"
import { InventoryAgent } from "@/lib/agents/inventory/InventoryAgent"
import { ProcurementAgent } from "@/lib/agents/procurement/ProcurementAgent"
import { SupplierAgent } from "@/lib/agents/supplier/SupplierAgent"
import { AnalyticsAgent } from "@/lib/agents/analytics/AnalyticsAgent"
import { ManagerAgent } from "@/lib/agents/manager/ManagerAgent"

export async function POST(req: Request) {
  try {
    const { agentName, taskInput } = await req.json()

    if (!agentName) {
      return NextResponse.json({ error: "Missing agentName." }, { status: 400 })
    }

    const context = {
      sessionId: `test-web-session-${Date.now()}`,
      userId: "test-admin-user",
    }

    // Determine task configuration
    let taskType = "STOCK_CHECK"
    let taskDesc = "Manual test web execution"

    if (agentName === "CustomerAgent") {
      taskType = "ANALYZE_EMAIL"
      taskDesc = "Analyze customer support email"
    } else if (agentName === "InventoryAgent") {
      taskType = "STOCK_CHECK"
      taskDesc = "Verify product inventory stock availability"
    } else if (agentName === "ProcurementAgent") {
      taskType = "DRAFT_PO"
      taskDesc = "Draft wholesale purchase order"
    } else if (agentName === "SupplierAgent") {
      taskType = "PARSE_REPLY"
      taskDesc = "Parse supplier email confirmation reply"
    } else if (agentName === "AnalyticsAgent") {
      taskType = "GET_SNAPSHOT"
      taskDesc = "Compile business metric summaries"
    } else if (agentName === "ManagerAgent") {
      taskType = taskInput.type || "REPLENISHMENT_WORKFLOW"
      taskDesc = `Manager Agent workflow orchestration: ${taskType}`
    }

    const task = {
      id: `test-task-${Date.now()}`,
      type: taskType,
      description: taskDesc,
      input: taskInput || {},
      createdAt: new Date(),
    }

    // Instantiate and inject sub-agents
    const customerAgent = new CustomerAgent()
    const inventoryAgent = new InventoryAgent()
    const procurementAgent = new ProcurementAgent()
    const supplierAgent = new SupplierAgent()
    const analyticsAgent = new AnalyticsAgent()

    const managerAgent = new ManagerAgent(
      customerAgent,
      inventoryAgent,
      procurementAgent,
      supplierAgent,
      analyticsAgent
    )

    let selectedAgent: IAgent = customerAgent
    if (agentName === "CustomerAgent") {
      selectedAgent = customerAgent
    } else if (agentName === "InventoryAgent") {
      selectedAgent = inventoryAgent
    } else if (agentName === "ProcurementAgent") {
      selectedAgent = procurementAgent
    } else if (agentName === "SupplierAgent") {
      selectedAgent = supplierAgent
    } else if (agentName === "AnalyticsAgent") {
      selectedAgent = analyticsAgent
    } else if (agentName === "ManagerAgent") {
      selectedAgent = managerAgent
    }

    const tStart = performance.now()
    const result = await selectedAgent.execute(task, context)
    const tEnd = performance.now()
    const durationMs = Math.round(tEnd - tStart)

    return NextResponse.json({
      status: "success",
      durationMs,
      result,
    })
  } catch (error) {
    console.error("[TestAgentAPI] Execution error:", error)
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
