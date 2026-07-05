import { prisma } from "@/lib/prisma"
import { Task, AgentResult, AgentContext, ExecutionLog } from "../shared/types"

export class InventoryAgent {
  private agentName = "InventoryAgent"

  /**
   * Executes inventory check and adjustments.
   */
  async execute(task: Task, context: AgentContext): Promise<AgentResult> {
    const logs: ExecutionLog[] = []
    const log = (message: string, level: ExecutionLog["level"] = "INFO") => {
      logs.push({ agentName: this.agentName, level, message, timestamp: new Date() })
    }

    log(`Received inventory task: "${task.type}" - "${task.description}" (Session: ${context.sessionId})`)

    try {
      switch (task.type) {
        case "STOCK_CHECK": {
          const { sku } = task.input as { sku?: string }
          if (!sku) {
            throw new Error("Missing product SKU in input.")
          }
          log(`Checking stock levels for SKU: ${sku}`)

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
            log(`Product SKU "${sku}" not found in database catalog.`, "WARN")
            return {
              agentName: this.agentName,
              status: "SUCCESS",
              output: { found: false },
              logs,
            }
          }

          const stock = product.inventory?.quantity ?? 0
          const threshold = product.inventory?.minStockLevel ?? 10
          
          // Calculate reserved from pending/processing customer orders
          const reserved = product.orderItems
            .filter((item) => item.order.status === "PENDING" || item.order.status === "PROCESSING")
            .reduce((sum, item) => sum + item.quantity, 0)

          const available = Math.max(0, stock - reserved)
          const needsReplenishment = available <= threshold

          log(`Stock status: ${sku} (On-Hand: ${stock}, Reserved: ${reserved}, Available: ${available}, Threshold: ${threshold})`)
          if (needsReplenishment) {
            log(`Alert: Available stock for "${sku}" fell below replenishment threshold!`, "WARN")
          }

          return {
            agentName: this.agentName,
            status: "SUCCESS",
            output: {
              found: true,
              productId: product.id,
              name: product.name,
              sku: product.sku,
              price: product.price,
              onHand: stock,
              reserved,
              available,
              threshold,
              needsReplenishment,
            },
            logs,
          }
        }

        case "ADJUST_STOCK": {
          const { sku, adjustment } = task.input as { sku?: string; adjustment?: number }
          if (!sku || adjustment === undefined) {
            throw new Error("Missing required inputs (sku, adjustment).")
          }

          log(`Adjusting stock level for SKU "${sku}" by ${adjustment}`)
          const product = await prisma.product.findUnique({
            where: { sku },
            include: { inventory: true },
          })

          if (!product || !product.inventory) {
            throw new Error(`Inventory record not found for SKU "${sku}".`)
          }

          const updatedInventory = await prisma.inventory.update({
            where: { id: product.inventory.id },
            data: {
              quantity: {
                increment: Number(adjustment),
              },
            },
          })

          log(`Stock adjusted. New quantity for "${sku}": ${updatedInventory.quantity}`)
          return {
            agentName: this.agentName,
            status: "SUCCESS",
            output: {
              adjusted: true,
              sku,
              oldQuantity: product.inventory.quantity,
              newQuantity: updatedInventory.quantity,
            },
            logs,
          }
        }

        default:
          throw new Error(`Unsupported task type "${task.type}" for InventoryAgent.`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`Execution failed: ${message}`, "ERROR")
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
