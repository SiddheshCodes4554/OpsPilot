import { Task, AgentResult, AgentContext, ExecutionLog } from "../shared/types"
import { CustomerAgent } from "../customer/CustomerAgent"
import { InventoryAgent } from "../inventory/InventoryAgent"
import { ProcurementAgent } from "../procurement/ProcurementAgent"
import { SupplierAgent } from "../supplier/SupplierAgent"
import { AnalyticsAgent } from "../analytics/AnalyticsAgent"

export class ManagerAgent {
  private agentName = "ManagerAgent"
  private customerAgent = new CustomerAgent()
  private inventoryAgent = new InventoryAgent()
  private procurementAgent = new ProcurementAgent()
  private supplierAgent = new SupplierAgent()
  private analyticsAgent = new AnalyticsAgent()

  /**
   * Orchestrates multi-agent pipelines. Coordinates specialized agents to complete workflows.
   */
  async execute(task: Task, context: AgentContext): Promise<AgentResult> {
    const logs: ExecutionLog[] = []
    const log = (message: string, level: ExecutionLog["level"] = "INFO") => {
      logs.push({ agentName: this.agentName, level, message, timestamp: new Date() })
    }

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
              input: { sku },
              createdAt: new Date(),
            },
            context
          )
          logs.push(...stockResult.logs)

          if (stockResult.status === "FAILURE") {
            throw new Error(`Inventory stock check failed: ${stockResult.errors?.join(", ")}`)
          }

          const { needsReplenishment, name, price, productId } = stockResult.output
          if (!needsReplenishment) {
            log(`Product "${name}" is healthy. No replenishment needed. Concluding workflow.`)
            return {
              agentName: this.agentName,
              status: "SUCCESS",
              output: {
                workflowCompleted: true,
                replenishmentTriggered: false,
                stockCheck: stockResult.output,
              },
              logs,
            }
          }

          // Step 2: Get supplier details
          log(`Step 2: Replenishment needed. Querying SupplierAgent for product: ${sku}`)
          const supplierResult = await this.supplierAgent.execute(
            {
              id: `${task.id}-step2`,
              type: "GET_SUPPLIER_FOR_PRODUCT",
              description: `Getting supplier for product ID ${productId}`,
              input: { productId },
              createdAt: new Date(),
            },
            context
          )
          logs.push(...supplierResult.logs)

          if (supplierResult.status === "FAILURE") {
            throw new Error(`Supplier matching failed: ${supplierResult.errors?.join(", ")}`)
          }

          const { found, supplier } = supplierResult.output
          if (!found || !supplier) {
            throw new Error(`Primary supplier not configured or found for SKU "${sku}".`)
          }

          // Step 3: Draft PO
          log(`Step 3: Supplier found: "${supplier.name}". Dispatching DRAFT_PO to ProcurementAgent.`)
          const draftResult = await this.procurementAgent.execute(
            {
              id: `${task.id}-step3`,
              type: "DRAFT_PO",
              description: `Drafting replenishment PO with ${supplier.name}`,
              input: {
                supplierId: supplier.id,
                productId,
                quantity,
                unitPrice: price,
                etaDays: 5,
              },
              createdAt: new Date(),
            },
            context
          )
          logs.push(...draftResult.logs)

          if (draftResult.status === "FAILURE") {
            throw new Error(`Procurement draft PO failed: ${draftResult.errors?.join(", ")}`)
          }

          const { purchaseOrderId } = draftResult.output
          
          // Step 4: Approve PO
          log(`Step 4: PO drafted successfully. Dispatching APPROVE_PO to ProcurementAgent for ID: ${purchaseOrderId}`)
          const approveResult = await this.procurementAgent.execute(
            {
              id: `${task.id}-step4`,
              type: "APPROVE_PO",
              description: `Approving PO ${purchaseOrderId}`,
              input: {
                purchaseOrderId,
                comments: "System auto-replenishment triggered and approved.",
              },
              createdAt: new Date(),
            },
            context
          )
          logs.push(...approveResult.logs)

          if (approveResult.status === "FAILURE") {
            throw new Error(`Procurement PO approval failed: ${approveResult.errors?.join(", ")}`)
          }

          // Step 5: Get updated snapshot metrics
          log(`Step 5: Purchase Order completed. Dispatching GET_SNAPSHOT to AnalyticsAgent.`)
          const analyticsResult = await this.analyticsAgent.execute(
            {
              id: `${task.id}-step5`,
              type: "GET_SNAPSHOT",
              description: "Getting ledger overview snapshot",
              input: {},
              createdAt: new Date(),
            },
            context
          )
          logs.push(...analyticsResult.logs)

          log("All replenishment workflow steps executed successfully.")
          return {
            agentName: this.agentName,
            status: "SUCCESS",
            output: {
              workflowCompleted: true,
              replenishmentTriggered: true,
              stockDetails: stockResult.output,
              supplierDetails: supplier.name,
              purchaseOrderDetails: approveResult.output,
              businessSnapshot: analyticsResult.output,
            },
            logs,
          }
        }

        case "CUSTOMER_INQUIRY_WORKFLOW": {
          const { email, subject, body } = task.input as { email?: string; subject?: string; body?: string }
          if (!email || !subject || !body) {
            throw new Error("Missing required inputs (email, subject, body) for CUSTOMER_INQUIRY_WORKFLOW.")
          }

          log(`Step 1: Dispatching CUSTOMER_LOOKUP to CustomerAgent for email: "${email}"`)
          const customerResult = await this.customerAgent.execute(
            {
              id: `${task.id}-step1`,
              type: "CUSTOMER_LOOKUP",
              description: `Looking up customer profile for ${email}`,
              input: { email },
              createdAt: new Date(),
            },
            context
          )
          logs.push(...customerResult.logs)

          if (customerResult.status === "FAILURE") {
            throw new Error(`Customer lookup failed: ${customerResult.errors?.join(", ")}`)
          }

          log(`Step 2: Dispatching LOG_CUSTOMER_EMAIL to CustomerAgent`)
          const logEmailResult = await this.customerAgent.execute(
            {
              id: `${task.id}-step2`,
              type: "LOG_CUSTOMER_EMAIL",
              description: `Logging email thread from ${email}`,
              input: {
                email,
                subject,
                body,
                status: "RECEIVED",
                priority: "MEDIUM",
              },
              createdAt: new Date(),
            },
            context
          )
          logs.push(...logEmailResult.logs)

          if (logEmailResult.status === "FAILURE") {
            throw new Error(`Customer email log failed: ${logEmailResult.errors?.join(", ")}`)
          }

          log("Customer inquiry workflow executed successfully.")
          return {
            agentName: this.agentName,
            status: "SUCCESS",
            output: {
              workflowCompleted: true,
              customerLookup: customerResult.output,
              loggedEmail: logEmailResult.output,
            },
            logs,
          }
        }

        default:
          throw new Error(`Unsupported orchestration task type "${task.type}" for ManagerAgent.`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`Orchestration pipeline failed: ${message}`, "ERROR")
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
