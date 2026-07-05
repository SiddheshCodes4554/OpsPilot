import { Task, AgentResult, AgentContext, ExecutionLog, IAgent } from "../shared/types"
import { IAgentLogger } from "../../logger/types"
import { AgentLogger } from "../../logger/AgentLogger"
import { prisma } from "../../prisma"
import {
  KnowledgeAgent,
  WarrantyAgent,
  RefundAgent,
  ReturnAgent,
  SupportAgent,
  CustomerResponseAgent
} from "../shared/ExtraAgents"

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/**
 * Payload shape forwarded to POST /api/email/reply after each completed workflow.
 * ManagerAgent never generates or sends emails itself — all dispatch is delegated
 * to the email reply API which handles templates, rendering, sending, and DB persistence.
 */
interface EmailDispatch {
  recipient: string
  recipientName?: string
  subject: string
  body: string
  type:
    | "CUSTOMER_REPLY"
    | "SUPPLIER_REPLY"
    | "APPROVAL_REQUEST"
    | "INVENTORY_ALERT"
    | "NOTIFICATION"
    | "ORDER_CONFIRMATION"
    | "WARRANTY_RESPONSE"
    | "PRODUCT_INQUIRY"
    | "REFUND"
    | "COMPLAINT"
    | "GENERAL"
  priority?: "LOW" | "MEDIUM" | "HIGH"
}

export class ManagerAgent implements IAgent {
  private agentName = "ManagerAgent"
  private logger: IAgentLogger
  private customerAgent: IAgent
  private inventoryAgent: IAgent
  private procurementAgent: IAgent
  private supplierAgent: IAgent
  private analyticsAgent: IAgent

  // Extensible workflow routing sub-agents
  private knowledgeAgent: IAgent
  private warrantyAgent: IAgent
  private refundAgent: IAgent
  private returnAgent: IAgent
  private supportAgent: IAgent
  private customerResponseAgent: IAgent

  constructor(
    customerAgent: IAgent,
    inventoryAgent: IAgent,
    procurementAgent: IAgent,
    supplierAgent: IAgent,
    analyticsAgent: IAgent,
    knowledgeAgent?: IAgent,
    warrantyAgent?: IAgent,
    refundAgent?: IAgent,
    returnAgent?: IAgent,
    supportAgent?: IAgent,
    customerResponseAgent?: IAgent,
    logger?: IAgentLogger
  ) {
    this.customerAgent = customerAgent
    this.inventoryAgent = inventoryAgent
    this.procurementAgent = procurementAgent
    this.supplierAgent = supplierAgent
    this.analyticsAgent = analyticsAgent
    this.logger = logger ?? AgentLogger.getInstance()

    // Dependency injection fallback for new agents to prevent breaking existing instantiation sites
    this.knowledgeAgent = knowledgeAgent ?? new KnowledgeAgent(this.logger)
    this.warrantyAgent = warrantyAgent ?? new WarrantyAgent(this.logger)
    this.refundAgent = refundAgent ?? new RefundAgent(this.logger)
    this.returnAgent = returnAgent ?? new ReturnAgent(this.logger)
    this.supportAgent = supportAgent ?? new SupportAgent(this.logger)
    this.customerResponseAgent = customerResponseAgent ?? new CustomerResponseAgent(this.logger)
  }

  // ---------------------------------------------------------------------------
  // Email dispatch — delegates entirely to POST /api/email/reply.
  // Agents never call EmailService or write to prisma.email directly.
  // ---------------------------------------------------------------------------

  /**
   * Fire-and-forget email dispatch.
   * Failures are logged but never throw — a workflow should never fail because
   * of an email dispatch error.
   */
  private async dispatchEmailReply(dispatch: EmailDispatch): Promise<void> {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        "http://localhost:3000"

      const res = await fetch(`${baseUrl}/api/email/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dispatch),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        console.warn(
          `[ManagerAgent] Email reply dispatch returned ${res.status}:`,
          errBody
        )
      }
    } catch (err) {
      console.error("[ManagerAgent] dispatchEmailReply failed (non-fatal):", err)
    }
  }

  // ---------------------------------------------------------------------------
  // Main orchestration entry point
  // ---------------------------------------------------------------------------

  /**
   * Orchestrates multi-agent routing workflows based on CustomerAgent intent.
   * After every completed workflow, returns { reply, subject, recipient, template }
   * and delegates email sending to POST /api/email/reply.
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

    log(`ManagerAgent initiated routing flow (Session: ${context.sessionId})`)

    try {
      switch (task.type) {
        // ─────────────────────────────────────────────────────────────────────
        case "REPLENISHMENT_WORKFLOW": {
          const { sku, quantity } = task.input as { sku?: string; quantity?: number }
          if (!sku || quantity === undefined) {
            throw new Error("Missing required inputs (sku, quantity) for REPLENISHMENT_WORKFLOW.")
          }

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

          log(`Step 2: Replenishment needed. Dispatching DRAFT_PO to ProcurementAgent for SKU: "${sku}"`)
          const procurementResult = await this.procurementAgent.execute(
            {
              id: `${task.id}-step2`,
              type: "DRAFT_PO",
              description: `Drafting replenishment PO for SKU: ${sku}`,
              input: { sku, quantity: recommendedQuantity || quantity },
              createdAt: new Date(),
            },
            context
          )
          logs.push(...procurementResult.logs)

          if (procurementResult.status === "FAILURE") {
            throw new Error(`Procurement draft PO failed: ${procurementResult.errors?.join(", ")}`)
          }

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

        // ─────────────────────────────────────────────────────────────────────
        case "CUSTOMER_INQUIRY_WORKFLOW": {
          const { email, subject, body } = task.input as {
            email?: string
            subject?: string
            body?: string
          }
          if (!email || !subject || !body) {
            throw new Error(
              "Missing required inputs (email, subject, body) for CUSTOMER_INQUIRY_WORKFLOW."
            )
          }

          // Step 1: Classify intent via CustomerAgent
          log(`Step 1: Dispatching ANALYZE_EMAIL to CustomerAgent for email from: "${email}"`)
          const analysisResult = await this.customerAgent.execute(
            {
              id: `${task.id}-step1`,
              type: "ANALYZE_EMAIL",
              description: `Analyzing customer email: ${subject}`,
              input: { email, subject, body },
              createdAt: new Date(),
            },
            context
          )
          logs.push(...analysisResult.logs)

          if (analysisResult.status === "FAILURE") {
            throw new Error(
              `Customer email analysis failed: ${analysisResult.errors?.join(", ")}`
            )
          }

          const { customerName, intent, product, quantity } = analysisResult.output as {
            customerName?: string
            intent: string
            product?: string
            quantity?: number
          }

          log(`Customer intent identified: "${intent}". Routing workflow accordingly.`)

          // Ensure CRM customer record exists
          let customer = await prisma.customer.findUnique({ where: { email } })
          if (!customer) {
            customer = await prisma.customer.create({
              data: {
                email,
                name: customerName || email.split("@")[0],
              },
            })
            log(`Created Customer CRM record for "${email}".`)
          }

          // ── Step 2: Route by intent ────────────────────────────────────────
          switch (intent) {
            // ── ORDER ─────────────────────────────────────────────────────────
            case "ORDER": {
              if (!product) {
                throw new Error("No product specified in customer order request.")
              }

              const matchedProduct = await prisma.product.findFirst({
                where: {
                  OR: [
                    { sku: { equals: product.trim().toUpperCase() } },
                    { name: { contains: product.trim(), mode: "insensitive" } },
                  ],
                },
                include: { inventory: true },
              })

              if (!matchedProduct) {
                log(`Could not find product "${product}" in catalog. Generating inquiry response.`)
                const replyText = `Dear ${customer.name},\n\nWe could not find the requested item "${product}" in our current catalog. Please check if the name or SKU is correct.\n\nBest regards,\nCustomer Support`
                const replySubject = `Re: ${subject}`

                await this.dispatchEmailReply({
                  recipient: email,
                  recipientName: customer.name,
                  subject: replySubject,
                  body: replyText,
                  type: "CUSTOMER_REPLY",
                  priority: "MEDIUM",
                })
                log(`Product-not-found reply dispatched to "${email}".`)

                const result: AgentResult = {
                  agentName: this.agentName,
                  status: "SUCCESS",
                  output: {
                    workflow: "ORDER_PRODUCT_NOT_FOUND",
                    intent,
                    reply: replyText,
                    subject: replySubject,
                    recipient: email,
                    template: "CUSTOMER_REPLY",
                  },
                  logs,
                }
                this.logger.logSuccess(executionId, 1.0, result.output)
                return result
              }

              const orderQty = quantity && quantity > 0 ? quantity : 1
              log(`Checking stock levels for catalog product: "${matchedProduct.sku}"`)

              const stockResult = await this.inventoryAgent.execute(
                {
                  id: `${task.id}-order-stock`,
                  type: "STOCK_CHECK",
                  description: "Verify stock level for order",
                  input: { sku: matchedProduct.sku, quantity: orderQty },
                  createdAt: new Date(),
                },
                context
              )
              logs.push(...stockResult.logs)

              const { available, recommendedQuantity } = stockResult.output as {
                available: boolean
                recommendedQuantity: number
              }

              if (available) {
                // Deduct stock and create order atomically
                const orderAmount = Number(matchedProduct.price) * orderQty
                const newOrder = await prisma.$transaction(async (tx) => {
                  await tx.inventory.update({
                    where: { productId: matchedProduct.id },
                    data: { quantity: { decrement: orderQty } },
                  })
                  return tx.order.create({
                    data: {
                      customerId: customer!.id,
                      status: "PENDING",
                      totalAmount: orderAmount,
                      items: {
                        create: [
                          {
                            productId: matchedProduct.id,
                            quantity: orderQty,
                            unitPrice: matchedProduct.price,
                          },
                        ],
                      },
                    },
                  })
                })

                log(`Customer Order #${newOrder.id.substring(0, 8).toUpperCase()} placed.`)

                const confirmationBody = `Dear ${customer.name},\n\nYour order for ${orderQty}x ${matchedProduct.name} has been confirmed.\n\nOrder ID: ${newOrder.id}\nTotal: $${orderAmount.toFixed(2)}\n\nWe will notify you once your order ships.\n\nBest regards,\nOpsPilot Operations`
                const confirmSubject = `Order Confirmed — ${newOrder.id.substring(0, 8).toUpperCase()}`

                await prisma.notification.create({
                  data: {
                    title: "New Customer Order Placed",
                    content: `Order placed for ${customer.name}: ${orderQty}x ${matchedProduct.name} (Total: $${orderAmount.toFixed(2)})`,
                  },
                })

                await this.dispatchEmailReply({
                  recipient: email,
                  recipientName: customer.name,
                  subject: confirmSubject,
                  body: confirmationBody,
                  type: "ORDER_CONFIRMATION",
                  priority: "MEDIUM",
                })
                log(`Order confirmation dispatched to "${email}".`)

                const result: AgentResult = {
                  agentName: this.agentName,
                  status: "SUCCESS",
                  output: {
                    workflow: "ORDER_PLACED",
                    intent,
                    orderId: newOrder.id,
                    reply: confirmationBody,
                    subject: confirmSubject,
                    recipient: email,
                    template: "ORDER_CONFIRMATION",
                  },
                  logs,
                }
                this.logger.logSuccess(executionId, 1.0, result.output)
                return result
              } else {
                // Stock deficit — procure
                log(`Stock deficit. Triggering replenishment PO for quantity: ${recommendedQuantity}`)
                const procurementResult = await this.procurementAgent.execute(
                  {
                    id: `${task.id}-order-procure`,
                    type: "DRAFT_PO",
                    description: "Procure items for shortage",
                    input: {
                      sku: matchedProduct.sku,
                      quantity: recommendedQuantity || orderQty,
                    },
                    createdAt: new Date(),
                  },
                  context
                )
                logs.push(...procurementResult.logs)

                const { purchaseOrderDraft, approvalRequired } = procurementResult.output as {
                  purchaseOrderDraft: { id: string; status: string; totalAmount: number }
                  approvalRequired: boolean
                }

                let approvalRecord = null
                if (approvalRequired && purchaseOrderDraft) {
                  approvalRecord = await prisma.approval.create({
                    data: {
                      purchaseOrderId: purchaseOrderDraft.id,
                      status: "PENDING",
                      comments: "Auto-generated: PO cost exceeds limit ($1,000).",
                    },
                  })
                  log(`Approval request raised for PO ID: ${purchaseOrderDraft.id}`)
                }

                await prisma.notification.create({
                  data: {
                    title: "Stock Shortage: PO Created",
                    content: `Stock deficit for ${matchedProduct.name}. Raised PO for ${recommendedQuantity || orderQty} units.`,
                  },
                })

                const backorderBody = `Dear ${customer.name},\n\nThank you for your order. Unfortunately, ${matchedProduct.name} is temporarily out of stock. We have raised a replenishment order with our supplier and will fulfil your request as soon as stock arrives.\n\nBest regards,\nOpsPilot Operations`
                const backorderSubject = `Re: ${subject} — Stock Update`

                await this.dispatchEmailReply({
                  recipient: email,
                  recipientName: customer.name,
                  subject: backorderSubject,
                  body: backorderBody,
                  type: "CUSTOMER_REPLY",
                  priority: "MEDIUM",
                })
                log(`Backorder notification dispatched to "${email}".`)

                const result: AgentResult = {
                  agentName: this.agentName,
                  status: "SUCCESS",
                  output: {
                    workflow: "REPLENISHMENT_TRIGGERED",
                    intent,
                    purchaseOrderId: purchaseOrderDraft?.id,
                    approval: approvalRecord,
                    reply: backorderBody,
                    subject: backorderSubject,
                    recipient: email,
                    template: "CUSTOMER_REPLY",
                  },
                  logs,
                }
                this.logger.logSuccess(executionId, 1.0, result.output)
                return result
              }
            }

            // ── PRODUCT_INQUIRY ────────────────────────────────────────────────
            case "PRODUCT_INQUIRY": {
              log("Dispatching to KnowledgeAgent...")
              const agentResult = await this.knowledgeAgent.execute(
                {
                  id: `${task.id}-step2`,
                  type: "DRAFT_REPLY",
                  description: "Draft technical response",
                  input: { subject, body },
                  createdAt: new Date(),
                },
                context
              )
              logs.push(...agentResult.logs)

              const { reply } = agentResult.output as { reply: string }
              const replySubject = `Re: ${subject}`

              await prisma.notification.create({
                data: {
                  title: "Product Inquiry Resolved",
                  content: `Technical specs reply generated for ${customer.name}.`,
                },
              })

              await this.dispatchEmailReply({
                recipient: email,
                recipientName: customer.name,
                subject: replySubject,
                body: reply,
                type: "PRODUCT_INQUIRY",
                priority: "LOW",
              })
              log(`Product inquiry reply dispatched to "${email}".`)

              const result: AgentResult = {
                agentName: this.agentName,
                status: "SUCCESS",
                output: {
                  workflow: "PRODUCT_INQUIRY_RESPONDED",
                  intent,
                  reply,
                  subject: replySubject,
                  recipient: email,
                  template: "PRODUCT_INQUIRY",
                },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }

            // ── WARRANTY ───────────────────────────────────────────────────────
            case "WARRANTY": {
              log("Dispatching to WarrantyAgent...")
              const agentResult = await this.warrantyAgent.execute(
                {
                  id: `${task.id}-step2`,
                  type: "DRAFT_REPLY",
                  description: "Draft warranty policy claims response",
                  input: { subject, body },
                  createdAt: new Date(),
                },
                context
              )
              logs.push(...agentResult.logs)

              const { reply } = agentResult.output as { reply: string }
              const replySubject = `Re: ${subject}`

              await prisma.notification.create({
                data: {
                  title: "Warranty Claim Processed",
                  content: `Warranty claim validation draft generated for ${customer.name}.`,
                },
              })

              await this.dispatchEmailReply({
                recipient: email,
                recipientName: customer.name,
                subject: replySubject,
                body: reply,
                type: "WARRANTY_RESPONSE",
                priority: "MEDIUM",
              })
              log(`Warranty reply dispatched to "${email}".`)

              const result: AgentResult = {
                agentName: this.agentName,
                status: "SUCCESS",
                output: {
                  workflow: "WARRANTY_RESPONDED",
                  intent,
                  reply,
                  subject: replySubject,
                  recipient: email,
                  template: "WARRANTY_RESPONSE",
                },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }

            // ── REFUND ─────────────────────────────────────────────────────────
            case "REFUND": {
              log("Dispatching to RefundAgent...")
              const agentResult = await this.refundAgent.execute(
                {
                  id: `${task.id}-step2`,
                  type: "DRAFT_REPLY",
                  description: "Draft refund update response",
                  input: { subject, body },
                  createdAt: new Date(),
                },
                context
              )
              logs.push(...agentResult.logs)

              const { reply } = agentResult.output as { reply: string }
              const replySubject = `Re: ${subject}`

              // Raise approval record for refund
              const approvalRecord = await prisma.approval.create({
                data: {
                  status: "PENDING",
                  comments: `Refund Approval requested for ${customer.name}: ${subject}`,
                },
              })
              log(`Refund validation approval requested.`)

              await prisma.notification.create({
                data: {
                  title: "Refund Request: Approval Raised",
                  content: `Refund claim raised for ${customer.name}. Manager approval pending.`,
                },
              })

              // Dispatch acknowledgement to customer
              await this.dispatchEmailReply({
                recipient: email,
                recipientName: customer.name,
                subject: replySubject,
                body: reply,
                type: "REFUND",
                priority: "HIGH",
              })
              log(`Refund acknowledgement dispatched to "${email}".`)

              // Dispatch approval request to reviewer
              const reviewerEmail =
                process.env.APPROVAL_REVIEWER_EMAIL || "manager@opspilot.ai"
              const approvalBody = `A refund request from ${customer.name} <${email}> for "${subject}" requires your approval.\n\nApproval ID: ${approvalRecord.id}\n\nPlease log in to the dashboard to review this request.`

              await this.dispatchEmailReply({
                recipient: reviewerEmail,
                subject: `[Refund Approval Required] ${customer.name} — ${subject}`,
                body: approvalBody,
                type: "APPROVAL_REQUEST",
                priority: "HIGH",
              })
              log(`Refund approval notification dispatched to reviewer.`)

              const result: AgentResult = {
                agentName: this.agentName,
                status: "SUCCESS",
                output: {
                  workflow: "REFUND_APPROVAL_RAISED",
                  intent,
                  approval: approvalRecord,
                  reply,
                  subject: replySubject,
                  recipient: email,
                  template: "REFUND",
                },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }

            // ── RETURN ─────────────────────────────────────────────────────────
            case "RETURN": {
              log("Dispatching to ReturnAgent...")
              const agentResult = await this.returnAgent.execute(
                {
                  id: `${task.id}-step2`,
                  type: "DRAFT_REPLY",
                  description: "Draft return window instructions",
                  input: { subject, body },
                  createdAt: new Date(),
                },
                context
              )
              logs.push(...agentResult.logs)

              const { reply } = agentResult.output as { reply: string }
              const replySubject = `Re: ${subject}`

              await prisma.notification.create({
                data: {
                  title: "Return Instructions Dispatched",
                  content: `RMA labels guidelines generated for ${customer.name}.`,
                },
              })

              await this.dispatchEmailReply({
                recipient: email,
                recipientName: customer.name,
                subject: replySubject,
                body: reply,
                type: "CUSTOMER_REPLY",
                priority: "MEDIUM",
              })
              log(`Return instructions dispatched to "${email}".`)

              const result: AgentResult = {
                agentName: this.agentName,
                status: "SUCCESS",
                output: {
                  workflow: "RETURN_RESPONDED",
                  intent,
                  reply,
                  subject: replySubject,
                  recipient: email,
                  template: "CUSTOMER_REPLY",
                },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }

            // ── COMPLAINT ──────────────────────────────────────────────────────
            case "COMPLAINT": {
              log("Dispatching to SupportAgent...")
              const agentResult = await this.supportAgent.execute(
                {
                  id: `${task.id}-step2`,
                  type: "DRAFT_REPLY",
                  description: "Draft complaint reconciliation response",
                  input: { subject, body },
                  createdAt: new Date(),
                },
                context
              )
              logs.push(...agentResult.logs)

              const { reply } = agentResult.output as { reply: string }
              const replySubject = `Re: ${subject}`

              await prisma.notification.create({
                data: {
                  title: "Complaint Escalation Formed",
                  content: `Complaint resolution draft generated for ${customer.name}.`,
                },
              })

              await this.dispatchEmailReply({
                recipient: email,
                recipientName: customer.name,
                subject: replySubject,
                body: reply,
                type: "COMPLAINT",
                priority: "HIGH",
              })
              log(`Complaint reply dispatched to "${email}".`)

              const result: AgentResult = {
                agentName: this.agentName,
                status: "SUCCESS",
                output: {
                  workflow: "COMPLAINT_RESPONDED",
                  intent,
                  reply,
                  subject: replySubject,
                  recipient: email,
                  template: "COMPLAINT",
                },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }

            // ── SUPPLIER ───────────────────────────────────────────────────────
            case "SUPPLIER": {
              log("Dispatching to SupplierAgent...")
              const agentResult = await this.supplierAgent.execute(
                {
                  id: `${task.id}-step2`,
                  type: "PARSE_REPLY",
                  description: "Parse supplier confirmation",
                  input: { subject, body },
                  createdAt: new Date(),
                },
                context
              )
              logs.push(...agentResult.logs)

              const { confirmed, invoiceNumber, deliveryDate } = agentResult.output as {
                confirmed: boolean
                invoiceNumber?: string
                deliveryDate?: string
              }

              let poUpdateMessage = "No active PO match was found."
              if (confirmed) {
                const matchedSupplier = await prisma.supplier.findFirst({
                  where: { email: { contains: email.split("@")[1] } },
                })

                if (matchedSupplier) {
                  const lastPendingPo = await prisma.purchaseOrder.findFirst({
                    where: { supplierId: matchedSupplier.id, status: "PENDING" },
                    orderBy: { createdAt: "desc" },
                  })

                  if (lastPendingPo) {
                    await prisma.purchaseOrder.update({
                      where: { id: lastPendingPo.id },
                      data: { status: "ORDERED" },
                    })
                    poUpdateMessage = `Purchase Order PO-${lastPendingPo.id.substring(0, 8).toUpperCase()} updated to ORDERED.`
                    log(poUpdateMessage)
                  }
                }
              }

              const reply = `Dear Supplier partner,\n\nThank you for your reply. We have processed the confirmation details:\n- Confirmed: ${confirmed ? "Yes" : "No"}\n- Invoice: ${invoiceNumber || "N/A"}\n- Est. Delivery: ${deliveryDate || "N/A"}\n\n${poUpdateMessage}\n\nBest regards,\nOpsPilot Operations`
              const replySubject = `Re: ${subject}`

              await prisma.notification.create({
                data: {
                  title: "Supplier Reply Parsed",
                  content: `Supplier confirmation processed. Status: ${confirmed ? "ORDERED" : "PENDING"}.`,
                },
              })

              await this.dispatchEmailReply({
                recipient: email,
                subject: replySubject,
                body: reply,
                type: "SUPPLIER_REPLY",
                priority: "MEDIUM",
              })
              log(`Supplier acknowledgement dispatched to "${email}".`)

              const result: AgentResult = {
                agentName: this.agentName,
                status: "SUCCESS",
                output: {
                  workflow: "SUPPLIER_REPLY_PROCESSED",
                  intent,
                  confirmed,
                  invoiceNumber,
                  deliveryDate,
                  update: poUpdateMessage,
                  reply,
                  subject: replySubject,
                  recipient: email,
                  template: "SUPPLIER_REPLY",
                },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }

            // ── SHIPPING / GENERAL ─────────────────────────────────────────────
            case "SHIPPING":
            case "GENERAL": {
              log("Dispatching to CustomerResponseAgent...")
              const agentResult = await this.customerResponseAgent.execute(
                {
                  id: `${task.id}-step2`,
                  type: "DRAFT_REPLY",
                  description: "Draft general/shipping reply",
                  input: { subject, body },
                  createdAt: new Date(),
                },
                context
              )
              logs.push(...agentResult.logs)

              const { reply } = agentResult.output as { reply: string }
              const replySubject = `Re: ${subject}`

              await prisma.notification.create({
                data: {
                  title: "General Response Sent",
                  content: `General reply dispatched to ${customer.name}.`,
                },
              })

              await this.dispatchEmailReply({
                recipient: email,
                recipientName: customer.name,
                subject: replySubject,
                body: reply,
                type: "GENERAL",
                priority: "LOW",
              })
              log(`General reply dispatched to "${email}".`)

              const result: AgentResult = {
                agentName: this.agentName,
                status: "SUCCESS",
                output: {
                  workflow: "GENERAL_RESPONDED",
                  intent,
                  reply,
                  subject: replySubject,
                  recipient: email,
                  template: "GENERAL",
                },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }

            // ── UNKNOWN ────────────────────────────────────────────────────────
            case "UNKNOWN":
            default: {
              log("Intent is UNKNOWN. Escalating directly to owner...", "WARN")
              const notification = await prisma.notification.create({
                data: {
                  title: "Escalated: Unknown Intent Email",
                  content: `Support email from ${customer.name} with subject "${subject}" could not be classified. Escalated to owner review.`,
                },
              })

              const result: AgentResult = {
                agentName: this.agentName,
                status: "SUCCESS",
                output: {
                  workflow: "ESCALATED_TO_OWNER",
                  intent,
                  notification,
                  reply: null,
                  subject: null,
                  recipient: null,
                  template: null,
                },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }
          }
        }

        // ─────────────────────────────────────────────────────────────────────
        default:
          throw new Error(
            `Unsupported orchestration task type "${task.type}" for ManagerAgent.`
          )
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
