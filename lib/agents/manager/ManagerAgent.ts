import { Task, AgentResult, AgentContext, ExecutionLog, IAgent } from "../shared/types"
import { IAgentLogger } from "../../logger/types"
import { AgentLogger } from "../../logger/AgentLogger"
import { prisma } from "../../prisma"
import { EmailService } from "../../email/EmailService"
import {
  KnowledgeAgent,
  WarrantyAgent,
  RefundAgent,
  ReturnAgent,
  SupportAgent,
  CustomerResponseAgent
} from "../shared/ExtraAgents"

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
  private emailService: EmailService

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
    logger?: IAgentLogger,
    emailService?: EmailService
  ) {
    this.customerAgent = customerAgent
    this.inventoryAgent = inventoryAgent
    this.procurementAgent = procurementAgent
    this.supplierAgent = supplierAgent
    this.analyticsAgent = analyticsAgent
    this.logger = logger ?? AgentLogger.getInstance()
    this.emailService = emailService ?? EmailService.fromEnv()

    // Dependency injection fallback for new agents to prevent breaking existing instantiation sites
    this.knowledgeAgent = knowledgeAgent ?? new KnowledgeAgent(this.logger)
    this.warrantyAgent = warrantyAgent ?? new WarrantyAgent(this.logger)
    this.refundAgent = refundAgent ?? new RefundAgent(this.logger)
    this.returnAgent = returnAgent ?? new ReturnAgent(this.logger)
    this.supportAgent = supportAgent ?? new SupportAgent(this.logger)
    this.customerResponseAgent = customerResponseAgent ?? new CustomerResponseAgent(this.logger)
  }

  /**
   * Orchestrates multi-agent routing workflows based on CustomerAgent intent.
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

          // Step 1: Call CustomerAgent to classify intent
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
            throw new Error(`Customer email analysis failed: ${analysisResult.errors?.join(", ")}`)
          }

          const { customerName, intent, product, quantity } = analysisResult.output as {
            customerName?: string
            intent: string
            product?: string
            quantity?: number
          }

          log(`Customer intent identified: "${intent}". Routing workflow accordingly.`)

          // Create CRM Customer profile if needed
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

          // Step 2: Route workflows by exact intent
          switch (intent) {
            case "ORDER": {
              if (!product) {
                throw new Error("No product specified in customer order request.")
              }

              // Match product in database catalog
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

                await prisma.email.create({
                  data: {
                    customerId: customer.id,
                    subject: `Re: ${subject}`,
                    body: replyText,
                    status: "SENT",
                    priority: "MEDIUM",
                    sender: "support@opspilot.ai",
                    recipient: email,
                  },
                })

                const result: AgentResult = {
                  agentName: this.agentName,
                  status: "SUCCESS",
                  output: { workflow: "ORDER_PRODUCT_NOT_FOUND", intent, replyText },
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
                // Deduct stock levels and place order in a transaction block
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
                        create: [{ productId: matchedProduct.id, quantity: orderQty, unitPrice: matchedProduct.price }],
                      },
                    },
                  })
                })

                log(`Customer Order PO-${newOrder.id.substring(0, 8).toUpperCase()} placed.`)

                // Notify customer via EmailService
                const orderConfirmBody = `Dear ${customer.name},\n\nYour order for ${orderQty}x ${matchedProduct.name} has been confirmed. Total: $${orderAmount.toFixed(2)}.\n\nWe will notify you once it ships.\n\nBest regards,\nOpsPilot Operations`
                await this.emailService.sendCustomerEmail(email, `Order Confirmation – ${matchedProduct.name}`, orderConfirmBody)
                log(`Order confirmation email dispatched to "${email}".`)

                const notification = await prisma.notification.create({
                  data: {
                    title: "New Customer Order Placed",
                    content: `Order successfully placed for ${customer.name}: ${orderQty}x ${matchedProduct.name} (Total: $${orderAmount.toFixed(2)})`,
                  },
                })

                const result: AgentResult = {
                  agentName: this.agentName,
                  status: "SUCCESS",
                  output: { workflow: "ORDER_PLACED", intent, orderId: newOrder.id, notification },
                  logs,
                }
                this.logger.logSuccess(executionId, 1.0, result.output)
                return result
              } else {
                // Stock deficit replenishment path
                log(`Stock deficit. Triggering replenishment PO for quantity: ${recommendedQuantity}`)
                const procurementResult = await this.procurementAgent.execute(
                  {
                    id: `${task.id}-order-procure`,
                    type: "DRAFT_PO",
                    description: "Procure items for shortage",
                    input: { sku: matchedProduct.sku, quantity: recommendedQuantity || orderQty },
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

                const notification = await prisma.notification.create({
                  data: {
                    title: "Stock Shortage: PO Created",
                    content: `Stock deficit for ${matchedProduct.name}. Raised PO for ${recommendedQuantity || orderQty} units.`,
                  },
                })

                const result: AgentResult = {
                  agentName: this.agentName,
                  status: "SUCCESS",
                  output: { workflow: "REPLENISHMENT_TRIGGERED", intent, purchaseOrderId: purchaseOrderDraft?.id, approval: approvalRecord, notification },
                  logs,
                }
                this.logger.logSuccess(executionId, 1.0, result.output)
                return result
              }
            }

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
              await prisma.email.create({
                data: {
                  customerId: customer.id,
                  subject: `Re: ${subject}`,
                  body: reply,
                  status: "SENT",
                  priority: "LOW",
                  sender: "support@opspilot.ai",
                  recipient: email,
                },
              })
              await this.emailService.sendCustomerEmail(email, `Re: ${subject}`, reply)
              log(`Product inquiry reply dispatched to "${email}".`)

              const notification = await prisma.notification.create({
                data: {
                  title: "Product Inquiry Resolved",
                  content: `Technical specs reply generated for ${customer.name}.`,
                },
              })

              const result: AgentResult = {
                agentName: this.agentName,
                status: "SUCCESS",
                output: { workflow: "PRODUCT_INQUIRY_RESPONDED", intent, reply, notification },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }

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
              await prisma.email.create({
                data: {
                  customerId: customer.id,
                  subject: `Re: ${subject}`,
                  body: reply,
                  status: "SENT",
                  priority: "MEDIUM",
                  sender: "warranty@opspilot.ai",
                  recipient: email,
                },
              })
              await this.emailService.sendCustomerEmail(email, `Re: ${subject}`, reply)
              log(`Warranty reply dispatched to "${email}".`)              

              const notification = await prisma.notification.create({
                data: {
                  title: "Warranty Claim Processed",
                  content: `Warranty claim validation draft generated for ${customer.name}.`,
                },
              })

              const result: AgentResult = {
                agentName: this.agentName,
                status: "SUCCESS",
                output: { workflow: "WARRANTY_RESPONDED", intent, reply, notification },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }

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

              // Create Approval request for refund
              const approvalRecord = await prisma.approval.create({
                data: {
                  status: "PENDING",
                  comments: `Refund Approval requested for ${customer.name}: ${subject}`,
                },
              })

              log(`Refund validation approval requested.`)

              await prisma.email.create({
                data: {
                  customerId: customer.id,
                  subject: `Re: ${subject}`,
                  body: reply,
                  status: "SENT",
                  priority: "HIGH",
                  sender: "billing@opspilot.ai",
                  recipient: email,
                },
              })
              await this.emailService.sendCustomerEmail(email, `Re: ${subject}`, reply)
              log(`Refund acknowledgement dispatched to "${email}".`)

              // Notify approval reviewer via email
              const approvalNoticeBody = `A refund request from ${customer.name} <${email}> for "${subject}" requires your approval.\n\nApproval ID: ${approvalRecord.id}\n\nPlease review at your earliest convenience.`
              await this.emailService.sendApprovalEmail(
                process.env.APPROVAL_REVIEWER_EMAIL || "manager@opspilot.ai",
                `Refund Approval Required – ${customer.name}`,
                approvalNoticeBody
              )
              log(`Refund approval notification email dispatched to reviewer.`)

              const notification = await prisma.notification.create({
                data: {
                  title: "Refund Request: Approval Raised",
                  content: `Refund claim raised for ${customer.name}. Manager approval pending.`,
                },
              })

              const result: AgentResult = {
                agentName: this.agentName,
                status: "SUCCESS",
                output: { workflow: "REFUND_APPROVAL_RAISED", intent, reply, approval: approvalRecord, notification },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }

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
              await prisma.email.create({
                data: {
                  customerId: customer.id,
                  subject: `Re: ${subject}`,
                  body: reply,
                  status: "SENT",
                  priority: "MEDIUM",
                  sender: "returns@opspilot.ai",
                  recipient: email,
                },
              })
              await this.emailService.sendCustomerEmail(email, `Re: ${subject}`, reply)
              log(`Return instructions dispatched to "${email}".`)

              const notification = await prisma.notification.create({
                data: {
                  title: "Return Instructions Dispatched",
                  content: `RMA labels guidelines generated for ${customer.name}.`,
                },
              })

              const result: AgentResult = {
                agentName: this.agentName,
                status: "SUCCESS",
                output: { workflow: "RETURN_RESPONDED", intent, reply, notification },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }

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
              await prisma.email.create({
                data: {
                  customerId: customer.id,
                  subject: `Re: ${subject}`,
                  body: reply,
                  status: "SENT",
                  priority: "HIGH",
                  sender: "relations@opspilot.ai",
                  recipient: email,
                },
              })
              await this.emailService.sendCustomerEmail(email, `Re: ${subject}`, reply)
              log(`Complaint reconciliation reply dispatched to "${email}".`)

              const notification = await prisma.notification.create({
                data: {
                  title: "Complaint Escalation Formed",
                  content: `Complaint resolution compensation drafted for ${customer.name}.`,
                },
              })

              const result: AgentResult = {
                agentName: this.agentName,
                status: "SUCCESS",
                output: { workflow: "COMPLAINT_RESPONDED", intent, reply, notification },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }

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
                // Database Update: Find latest pending PO for this supplier email domain, and update status to ORDERED
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

              await prisma.email.create({
                data: {
                  customerId: null,
                  subject: `Re: ${subject}`,
                  body: reply,
                  status: "SENT",
                  priority: "MEDIUM",
                  sender: "procurement@opspilot.ai",
                  recipient: email,
                },
              })
              await this.emailService.sendSupplierEmail(email, `Re: ${subject}`, reply)
              log(`Supplier reply acknowledgement dispatched to "${email}".`)

              const notification = await prisma.notification.create({
                data: {
                  title: "Supplier Reply Parsed",
                  content: `Supplier confirmation processed for wholesale order. status: ${confirmed ? "ORDERED" : "PENDING"}.`,
                },
              })

              const result: AgentResult = {
                agentName: this.agentName,
                status: "SUCCESS",
                output: { workflow: "SUPPLIER_REPLY_PROCESSED", intent, confirmed, invoiceNumber, deliveryDate, update: poUpdateMessage, notification },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }

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
              await prisma.email.create({
                data: {
                  customerId: customer.id,
                  subject: `Re: ${subject}`,
                  body: reply,
                  status: "SENT",
                  priority: "LOW",
                  sender: "info@opspilot.ai",
                  recipient: email,
                },
              })
              await this.emailService.sendCustomerEmail(email, `Re: ${subject}`, reply)
              log(`General reply dispatched to "${email}".`)

              const notification = await prisma.notification.create({
                data: {
                  title: "General Response Sent",
                  content: `General relations reply dispatched to ${customer.name}.`,
                },
              })

              const result: AgentResult = {
                agentName: this.agentName,
                status: "SUCCESS",
                output: { workflow: "GENERAL_RESPONDED", intent, reply, notification },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }

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
                output: { workflow: "ESCALATED_TO_OWNER", intent, notification },
                logs,
              }
              this.logger.logSuccess(executionId, 1.0, result.output)
              return result
            }
          }
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
