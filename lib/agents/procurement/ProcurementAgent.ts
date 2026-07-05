import { prisma } from "@/lib/prisma"
import { Task, AgentResult, AgentContext, ExecutionLog } from "../shared/types"
import { PurchaseOrderStatus, ApprovalStatus } from "@prisma/client"

export class ProcurementAgent {
  private agentName = "ProcurementAgent"

  /**
   * Executes procurement purchase order workflows.
   */
  async execute(task: Task, context: AgentContext): Promise<AgentResult> {
    const logs: ExecutionLog[] = []
    const log = (message: string, level: ExecutionLog["level"] = "INFO") => {
      logs.push({ agentName: this.agentName, level, message, timestamp: new Date() })
    }

    log(`Received procurement task: "${task.type}" - "${task.description}" (Session: ${context.sessionId})`)

    try {
      switch (task.type) {
        case "DRAFT_PO": {
          const { supplierId, productId, quantity, unitPrice, etaDays } = task.input as {
            supplierId?: string
            productId?: string
            quantity?: number
            unitPrice?: number
            etaDays?: number
          }
          if (!supplierId || !productId || !quantity || !unitPrice) {
            throw new Error("Missing required inputs (supplierId, productId, quantity, unitPrice).")
          }

          log(`Drafting Purchase Order with Supplier ID "${supplierId}" for Product ID "${productId}" (Qty: ${quantity})`)

          // Compute PO amount
          const totalAmount = Number(unitPrice) * Number(quantity)
          
          // Calculate ETA if etaDays is provided
          const eta = etaDays ? new Date(Date.now() + Number(etaDays) * 24 * 60 * 60 * 1000) : null

          // Fetch admin user initiating task to associate with PO
          const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } })

          const purchaseOrder = await prisma.purchaseOrder.create({
            data: {
              supplierId,
              userId: adminUser?.id ?? null,
              status: "DRAFT" as PurchaseOrderStatus,
              totalAmount,
              eta,
              items: {
                create: [
                  {
                    productId,
                    quantity: Number(quantity),
                    unitPrice: Number(unitPrice),
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

          log(`Successfully drafted PO. Reference ID: PO-${purchaseOrder.id.substring(0, 8).toUpperCase()}`)
          return {
            agentName: this.agentName,
            status: "SUCCESS",
            output: {
              created: true,
              purchaseOrderId: purchaseOrder.id,
              purchaseOrder,
            },
            logs,
          }
        }

        case "APPROVE_PO": {
          const { purchaseOrderId, comments } = task.input as {
            purchaseOrderId?: string
            comments?: string
          }
          if (!purchaseOrderId) {
            throw new Error("Missing purchaseOrderId in input.")
          }

          log(`Approving Purchase Order ID "${purchaseOrderId}"`)
          
          const po = await prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } })
          if (!po) {
            throw new Error(`Purchase Order ID "${purchaseOrderId}" not found.`)
          }

          const updatedPo = await prisma.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: {
              status: "APPROVED" as PurchaseOrderStatus,
            },
          })

          // Log approval workflow item
          const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } })
          const approval = await prisma.approval.create({
            data: {
              purchaseOrderId,
              approverId: adminUser?.id ?? null,
              status: "APPROVED" as ApprovalStatus,
              comments: comments || "Approved automatically by system agent.",
            },
          })

          log(`PO ID "${purchaseOrderId}" status updated to APPROVED. Link Approval ID: ${approval.id}`)
          return {
            agentName: this.agentName,
            status: "SUCCESS",
            output: {
              approved: true,
              purchaseOrderId,
              status: updatedPo.status,
              approval,
            },
            logs,
          }
        }

        default:
          throw new Error(`Unsupported task type "${task.type}" for ProcurementAgent.`)
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
