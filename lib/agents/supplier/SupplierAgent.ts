import { prisma } from "@/lib/prisma"
import { Task, AgentResult, AgentContext, ExecutionLog } from "../shared/types"

export class SupplierAgent {
  private agentName = "SupplierAgent"

  /**
   * Executes supplier lookup and catalog mapping.
   */
  async execute(task: Task, context: AgentContext): Promise<AgentResult> {
    const logs: ExecutionLog[] = []
    const log = (message: string, level: ExecutionLog["level"] = "INFO") => {
      logs.push({ agentName: this.agentName, level, message, timestamp: new Date() })
    }

    log(`Received supplier task: "${task.type}" - "${task.description}" (Session: ${context.sessionId})`)

    try {
      switch (task.type) {
        case "GET_SUPPLIER_FOR_PRODUCT": {
          const { productId, sku } = task.input as { productId?: string; sku?: string }
          if (!productId && !sku) {
            throw new Error("Missing productId or sku in input.")
          }

          log(`Mapping product to its primary supplier (SKU: ${sku}, Product ID: ${productId})`)
          
          const product = await prisma.product.findFirst({
            where: {
              OR: [
                productId ? { id: productId } : {},
                sku ? { sku } : {},
              ],
            },
            include: {
              supplier: true,
            },
          })

          if (!product || !product.supplier) {
            log(`Primary supplier not configured or found for product.`, "WARN")
            return {
              agentName: this.agentName,
              status: "SUCCESS",
              output: { found: false },
              logs,
            }
          }

          log(`Successfully matched product "${product.name}" to Supplier "${product.supplier.name}"`)
          return {
            agentName: this.agentName,
            status: "SUCCESS",
            output: {
              found: true,
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              price: product.price,
              supplier: product.supplier,
            },
            logs,
          }
        }

        case "GET_SUPPLIER_CATALOG": {
          const { supplierId } = task.input as { supplierId?: string }
          if (!supplierId) {
            throw new Error("Missing supplierId in input.")
          }

          log(`Retrieving product catalog supplied by vendor ID: "${supplierId}"`)
          const supplier = await prisma.supplier.findUnique({
            where: { id: supplierId },
            include: {
              products: {
                include: {
                  inventory: true,
                },
              },
            },
          })

          if (!supplier) {
            throw new Error(`Supplier with ID "${supplierId}" not found.`)
          }

          log(`Successfully loaded catalog for "${supplier.name}". Catalog items: ${supplier.products.length}`)
          return {
            agentName: this.agentName,
            status: "SUCCESS",
            output: {
              supplierName: supplier.name,
              catalog: supplier.products,
            },
            logs,
          }
        }

        default:
          throw new Error(`Unsupported task type "${task.type}" for SupplierAgent.`)
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
