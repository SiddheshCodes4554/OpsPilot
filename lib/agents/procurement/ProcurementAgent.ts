import { prisma } from "@/lib/prisma"
import { Task, AgentResult, AgentContext, ExecutionLog } from "../shared/types"
import { PurchaseOrderStatus } from "@prisma/client"
import { IAgentLogger } from "../../logger/types"
import { AgentLogger } from "../../logger/AgentLogger"
import { GroqService } from "../../ai/GroqService"
import {
  EMAIL_DRAFT_SYSTEM_PROMPT,
  EMAIL_DRAFT_USER_TEMPLATE,
  EMAIL_DRAFT_SCHEMA,
} from "../../prompts/procurement"

export class ProcurementAgent {
  private agentName = "ProcurementAgent"
  private logger: IAgentLogger
  private groqService: GroqService

  constructor(logger?: IAgentLogger) {
    this.logger = logger ?? AgentLogger.getInstance()
    this.groqService = GroqService.getInstance()
  }

  /**
   * Executes procurement workflow.
   * Finds preferred supplier, generates purchase order, determines approvals, and drafts supplier email using Groq.
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

    log(`Received procurement task: "${task.type}" (Session: ${context.sessionId})`)

    try {
      // We support task types "DRAFT_PO" (for replenishment orchestrators) and custom checks.
      const { sku, productId, quantity, requestedQuantity, unitPrice, etaDays } = task.input as {
        sku?: string
        productId?: string
        quantity?: number
        requestedQuantity?: number
        unitPrice?: number
        etaDays?: number
      }

      const finalQuantity = quantity ?? requestedQuantity
      if (finalQuantity === undefined || finalQuantity <= 0) {
        throw new Error("Missing or invalid quantity parameter in input.")
      }

      log(`Locating product details in catalog...`)
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

      if (!product) {
        throw new Error(`Product not found (SKU: ${sku}, ProductID: ${productId}).`)
      }

      const supplier = product.supplier
      if (!supplier) {
        throw new Error(`Preferred supplier not configured for product "${product.name}".`)
      }

      log(`Found preferred supplier: "${supplier.name}"`)

      const price = unitPrice ?? Number(product.price)
      const totalAmount = price * finalQuantity
      const approvalRequired = totalAmount > 1000

      log(`Calculated total cost: $${totalAmount.toFixed(2)}. Approval Required: ${approvalRequired}`)

      const eta = etaDays ? new Date(Date.now() + Number(etaDays) * 24 * 60 * 60 * 1000) : new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)

      // Fetch admin user initiating task to associate with PO
      const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } })

      // Determine initial PO status: DRAFT if below threshold, PENDING if approval is required
      const status: PurchaseOrderStatus = approvalRequired ? "PENDING" : "DRAFT"

      log(`Writing Purchase Order record to database (Status: ${status})...`)
      const purchaseOrder = await prisma.purchaseOrder.create({
        data: {
          supplierId: supplier.id,
          userId: adminUser?.id ?? null,
          status,
          totalAmount,
          eta,
          items: {
            create: [
              {
                productId: product.id,
                quantity: finalQuantity,
                unitPrice: price,
              },
            ],
          },
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      })

      log(`Purchase Order reference PO-${purchaseOrder.id.substring(0, 8).toUpperCase()} created successfully.`)

      // Generate Supplier Email using Groq and the Prompt Engine
      log(`Generating supplier email draft using Groq...`)
      const emailMessages = [
        { role: "system" as const, content: EMAIL_DRAFT_SYSTEM_PROMPT },
        {
          role: "user" as const,
          content: EMAIL_DRAFT_USER_TEMPLATE({
            supplierName: supplier.name,
            contactName: supplier.contactName ?? "Sales Team",
            productName: product.name,
            sku: product.sku,
            quantity: finalQuantity,
            totalAmount,
          }),
        },
      ]

      const emailDraft = await this.groqService.chatStructured(
        emailMessages,
        EMAIL_DRAFT_SCHEMA,
        { temperature: 0.2 }
      )

      log(`Supplier email draft generated.`)

      const output = {
        purchaseOrderDraft: purchaseOrder,
        supplierEmailDraft: emailDraft,
        approvalRequired,
        supplier,
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
      log(`Procurement execution failed: ${message}`, "ERROR")
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
export { PurchaseOrderStatus }
