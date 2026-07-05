import { prisma } from "@/lib/prisma"
import { Task, AgentResult, AgentContext, ExecutionLog } from "../shared/types"

export class AnalyticsAgent {
  private agentName = "AnalyticsAgent"

  /**
   * Executes analytics compilation and audit tasks.
   */
  async execute(task: Task, context: AgentContext): Promise<AgentResult> {
    const logs: ExecutionLog[] = []
    const log = (message: string, level: ExecutionLog["level"] = "INFO") => {
      logs.push({ agentName: this.agentName, level, message, timestamp: new Date() })
    }

    log(`Received analytics task: "${task.type}" - "${task.description}" (Session: ${context.sessionId})`)

    try {
      switch (task.type) {
        case "GET_SNAPSHOT": {
          log("Compiling real-time business metrics snapshot...")
          const [
            productCount,
            customerCount,
            supplierCount,
            allOrders,
          ] = await Promise.all([
            prisma.product.count(),
            prisma.customer.count(),
            prisma.supplier.count(),
            prisma.order.findMany({ select: { totalAmount: true } }),
          ])

          const totalSales = allOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)

          log(`Snapshot metrics compiled. Total Products: ${productCount}, Customers: ${customerCount}, Sales: $${totalSales.toFixed(2)}`)
          return {
            agentName: this.agentName,
            status: "SUCCESS",
            output: {
              totalSales,
              productCount,
              supplierCount,
              customerCount,
              orderCount: allOrders.length,
            },
            logs,
          }
        }

        case "RUN_ORDER_AUDIT": {
          log("Auditing active customer sales order ledger...")
          const orders = await prisma.order.findMany({
            include: {
              customer: true,
              items: {
                include: {
                  product: true,
                },
              },
            },
          })

          const totalOrders = orders.length
          if (totalOrders === 0) {
            log("No sales orders available for audit.", "WARN")
            return {
              agentName: this.agentName,
              status: "SUCCESS",
              output: { audited: 0, highValueOrders: [] },
              logs,
            }
          }

          const sumSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0)
          const avgOrderValue = sumSales / totalOrders

          // Identify orders above $1,000 threshold
          const highValueOrders = orders
            .filter((o) => Number(o.totalAmount) >= 1000)
            .map((o) => ({
              orderId: o.id,
              customerName: o.customer.name,
              totalAmount: o.totalAmount,
              status: o.status,
            }))

          log(`Audited ${totalOrders} orders. Average order size: $${avgOrderValue.toFixed(2)}. Flagged ${highValueOrders.length} high-value orders.`)
          return {
            agentName: this.agentName,
            status: "SUCCESS",
            output: {
              audited: totalOrders,
              totalSales: sumSales,
              avgOrderValue,
              highValueOrders,
            },
            logs,
          }
        }

        default:
          throw new Error(`Unsupported task type "${task.type}" for AnalyticsAgent.`)
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
