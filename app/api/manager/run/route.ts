import { NextResponse } from "next/server"
import { CustomerAgent } from "@/lib/agents/customer/CustomerAgent"
import { InventoryAgent } from "@/lib/agents/inventory/InventoryAgent"
import { ProcurementAgent } from "@/lib/agents/procurement/ProcurementAgent"
import { SupplierAgent } from "@/lib/agents/supplier/SupplierAgent"
import { AnalyticsAgent } from "@/lib/agents/analytics/AnalyticsAgent"
import { ManagerAgent } from "@/lib/agents/manager/ManagerAgent"
import { DbAgentLogger } from "@/lib/logger/DbAgentLogger"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { sender, subject, body: emailBody } = body as {
      sender: string
      subject: string
      body: string
    }

    if (!sender || !subject || !emailBody) {
      return NextResponse.json(
        { status: "error", message: "Missing required fields: sender, subject, or body." },
        { status: 400 }
      )
    }

    const sessionId = `web-run-${Date.now()}`
    const context = { sessionId, userId: "manager-api-trigger" }

    // Retrieve shared db-logger instance
    const dbLogger = DbAgentLogger.getInstance()

    // Instantiate modular agents with dbLogger injected
    const customerAgent = new CustomerAgent(dbLogger)
    const inventoryAgent = new InventoryAgent(dbLogger)
    const procurementAgent = new ProcurementAgent(dbLogger)
    const supplierAgent = new SupplierAgent(dbLogger)
    const analyticsAgent = new AnalyticsAgent(dbLogger)

    const managerAgent = new ManagerAgent(
      customerAgent,
      inventoryAgent,
      procurementAgent,
      supplierAgent,
      analyticsAgent,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      dbLogger
    )

    const task = {
      id: `run-inquiry-${Date.now()}`,
      type: "CUSTOMER_INQUIRY_WORKFLOW",
      description: "Process incoming support email",
      input: { email: sender, subject, body: emailBody },
      createdAt: new Date(),
    }

    // Delegate orchestration workflow fully to ManagerAgent
    const result = await managerAgent.execute(task, context)

    if (result.status === "FAILURE") {
      return NextResponse.json(
        {
          status: "error",
          message: result.errors?.join(", ") || "Orchestration workflow execution failed.",
          logs: result.logs,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: "success",
      ...result.output,
      logs: result.logs,
    })
  } catch (error) {
    console.error("[POST /api/manager/run] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
