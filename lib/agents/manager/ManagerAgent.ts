import { Task, AgentResult, AgentContext, ExecutionLog } from "../shared/types"
import { CustomerAgent } from "../customer/CustomerAgent"
import { InventoryAgent } from "../inventory/InventoryAgent"
import { ProcurementAgent } from "../procurement/ProcurementAgent"
import { SupplierAgent } from "../supplier/SupplierAgent"
import { AnalyticsAgent } from "../analytics/AnalyticsAgent"
import { IAgentLogger } from "../../logger/types"
import { AgentLogger } from "../../logger/AgentLogger"

export class ManagerAgent {
  private agentName = "ManagerAgent"
  private logger: IAgentLogger
  private customerAgent: CustomerAgent
  private inventoryAgent: InventoryAgent
  private procurementAgent: ProcurementAgent
  private supplierAgent: SupplierAgent
  private analyticsAgent: AnalyticsAgent

  constructor(logger?: IAgentLogger) {
    this.logger = logger ?? AgentLogger.getInstance()
    this.customerAgent = new CustomerAgent(this.logger)
    this.inventoryAgent = new InventoryAgent(this.logger)
    this.procurementAgent = new ProcurementAgent(this.logger)
    this.supplierAgent = new SupplierAgent(this.logger)
    this.analyticsAgent = new AnalyticsAgent(this.logger)
  }

  /**
   * Orchestrates multi-agent pipelines. Coordinates specialized agents to complete workflows.
   */
  async execute(task: Task, context: AgentContext): Promise<AgentResult> {
    const logs: ExecutionLog[] = []
    const log = (message: string, level: ExecutionLog["level"] = "INFO") => {
      logs.push({ agentName: this.agentName, level, message, timestamp: new Date() })
    }

    const executionId = this.logger.logStart(
      this.agentName,
      task.type,
      task.input as Record<string, unknown>
    )

    log(`ManagerAgent initiated. Routing task type: "${task.type}" (Session: ${context.sessionId})`)

    try {
      switch (task.type) {
        case "REPLENISHMENT_WORKFLOW": {
          const { sku, quantity } = task.input as { sku?: string; quantity?: number }
          if (!sku || !quantity) {
            throw new Error("Missing required inputs (sku, quantity) for REPLENISHMENT_WORKFLOW.")
          }

          // Step 1: Stock check check
          log(`Step 1: Dispatching STOCK_CHECK to InventoryAgent for SKU: "${sku}"`)
          const stockResult = await this.inventoryAgent.execute(
            {
              id: `${task.id}-step1`,
              type: "STOCK_CHECK",
              description: `Checking stock level for ${sku}`,
              input: { sku, quantity },
              createdAt: new Date(),
            },
            context
          )
          logs.push(...stockResult.logs)

          if (stockResult.status === "FAILURE") {
            throw new Error(`Inventory stock check failed: ${stockResult.errors?.join(", ")}`)
          }

          const { reorder, recommendedQuantity, name } = stockResult.output as {
            reorder: boolean
            recommendedQuantity: number
            name: string
          }
          if (!reorder) {
            log(`Product "${name}" is healthy. No replenishment needed. Concluding workflow.`)
            const result: AgentResult = {
              agentName: this.agentName,
              status: "SUCCESS",
              output: {
                workflowCompleted: true,
                replenishmentTriggered: false,
                stockCheck: stockResult.output,
              },
              logs,
            }
            this.logger.logSuccess(executionId, 1.0, result.output)
            return result
          }

          // Step 2: Dispatch DRAFT_PO to ProcurementAgent
          log(`Step 2: Replenishment needed. Dispatching DRAFT_PO to ProcurementAgent for SKU: "${sku}"`)
          const procurementResult = await this.procurementAgent.execute(
            {
              id: `${task.id}-step2`,
              type: "DRAFT_PO",
              description: `Drafting replenishment PO for SKU: ${sku}`,
              input: {
                sku,
                quantity: recommendedQuantity || quantity,
              },
              createdAt: new Date(),
            },
            context
          )
          logs.push(...procurementResult.logs)

          if (procurementResult.status === "FAILURE") {
            throw new Error(`Procurement draft PO failed: ${procurementResult.errors?.join(", ")}`)
          }

          // Step 3: Get updated snapshot metrics
          log(`Step 3: Purchase Order drafted. Dispatching GET_SNAPSHOT to AnalyticsAgent.`)
          const analyticsResult = await this.analyticsAgent.execute(
            {
              id: `${task.id}-step3`,
              type: "GET_SNAPSHOT",
              description: "Getting ledger overview snapshot",
              input: {},
              createdAt: new Date(),
            },
            context
          )
          logs.push(...analyticsResult.logs)

          log("All replenishment workflow steps executed successfully.")
          const result: AgentResult = {
            agentName: this.agentName,
            status: "SUCCESS",
            output: {
              workflowCompleted: true,
              replenishmentTriggered: true,
              stockCheck: stockResult.output,
              procurement: procurementResult.output,
              businessSnapshot: analyticsResult.output,
            },
            logs,
          }
          this.logger.logSuccess(executionId, 1.0, result.output)
          return result
        }

        case "CUSTOMER_INQUIRY_WORKFLOW": {
          const { email, subject, body } = task.input as { email?: string; subject?: string; body?: string }
          if (!email || !subject || !body) {
            throw new Error("Missing required inputs (email, subject, body) for CUSTOMER_INQUIRY_WORKFLOW.")
          }

          log(`Step 1: Dispatching ANALYZE_EMAIL to CustomerAgent for email subject: "${subject}"`)
          const analysisResult = await this.customerAgent.execute(
            {
              id: `${task.id}-step1`,
              type: "ANALYZE_EMAIL",
              description: `Analyzing customer support email: ${subject}`,
              input: { email, subject, body },
              createdAt: new Date(),
            },
            context
          )
          logs.push(...analysisResult.logs)

          if (analysisResult.status === "FAILURE") {
            throw new Error(`Customer email analysis failed: ${analysisResult.errors?.join(", ")}`)
          }

          log("Customer inquiry workflow executed successfully.")
          const result: AgentResult = {
            agentName: this.agentName,
            status: "SUCCESS",
            output: {
              workflowCompleted: true,
              analysis: analysisResult.output,
            },
            logs,
          }
          this.logger.logSuccess(executionId, 1.0, result.output)
          return result
        }

        default:
          throw new Error(`Unsupported orchestration task type "${task.type}" for ManagerAgent.`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`Orchestration pipeline failed: ${message}`, "ERROR")
      this.logger.logFailure(executionId, err instanceof Error ? err : message)
      return {
        agentName: this.agentName,
        status: "FAILURE",
        output: {},
        errors: [message],
        logs,
      }
    }
  }
}
