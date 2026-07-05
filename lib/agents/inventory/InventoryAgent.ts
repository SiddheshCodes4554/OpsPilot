import { prisma } from "@/lib/prisma"
import { Task, AgentResult, AgentContext, ExecutionLog, IAgent } from "../shared/types"
import { IAgentLogger } from "../../logger/types"
import { AgentLogger } from "../../logger/AgentLogger"

export class InventoryAgent implements IAgent {
  private agentName = "InventoryAgent"
  private logger: IAgentLogger

  constructor(logger?: IAgentLogger) {
    this.logger = logger ?? AgentLogger.getInstance()
  }

  /**
   * Executes inventory stock check and analysis.
   * Determines stock availability, reorder requirements, and suggested replenishment quantities.
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

    log(`Received inventory check task (Session: ${context.sessionId})`)

    try {
      if (task.type !== "STOCK_CHECK") {
        throw new Error(`Unsupported task type "${task.type}" for InventoryAgent.`)
      }

      const { sku, quantity } = task.input as { sku?: string; quantity?: number }
      if (!sku || quantity === undefined) {
        throw new Error("Missing required inputs (sku, quantity).")
      }

      log(`Querying database for SKU: "${sku}"...`)

      const product = await prisma.product.findUnique({
        where: { sku },
        include: {
          inventory: true,
          orderItems: {
            include: {
              order: true,
            },
          },
        },
      })

      if (!product) {
        throw new Error(`Product SKU "${sku}" not found in database catalog.`)
      }

      const onHand = product.inventory?.quantity ?? 0
      const threshold = product.inventory?.minStockLevel ?? 10
      
      // Calculate reserved items from pending/processing customer orders
      const reserved = product.orderItems
        .filter((item) => item.order.status === "PENDING" || item.order.status === "PROCESSING")
        .reduce((sum, item) => sum + item.quantity, 0)

      const remaining = onHand - reserved
      const available = remaining >= quantity
      const reorder = remaining <= threshold
      
      // Calculate recommended reorder quantity (e.g. bring available back to twice threshold level)
      const recommendedQuantity = reorder ? Math.max(0, (threshold * 2) - remaining) : 0

      log(`Stock calculations completed: SKU="${sku}", onHand=${onHand}, reserved=${reserved}, remaining=${remaining}, available=${available}, reorder=${reorder}, recommended=${recommendedQuantity}`)

      const output = {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: Number(product.price),
        available,
        remaining,
        reorder,
        recommendedQuantity,
      }

      const result: AgentResult = {
        agentName: this.agentName,
        status: "SUCCESS",
        output: output as Record<string, unknown>,
        logs,
      }

      this.logger.logSuccess(executionId, 1.0, result.output)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`Inventory check failed: ${message}`, "ERROR")
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
