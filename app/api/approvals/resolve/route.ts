import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ApprovalStatus, PurchaseOrderStatus } from "@prisma/client"
import { ProcurementAgent } from "@/lib/agents/procurement/ProcurementAgent"
import { DbAgentLogger } from "@/lib/logger/DbAgentLogger"
import { EmailService } from "@/lib/email/EmailService"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { approvalId, action, comments } = body as {
      approvalId: string
      action: "APPROVE" | "REJECT"
      comments?: string
    }

    if (!approvalId || !action) {
      return NextResponse.json(
        { status: "error", message: "Missing required fields: approvalId or action." },
        { status: 400 }
      )
    }

    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    })

    if (!approval) {
      return NextResponse.json({ status: "error", message: "Approval record not found." }, { status: 404 })
    }

    const po = approval.purchaseOrder
    if (!po) {
      return NextResponse.json({ status: "error", message: "No purchase order linked to this approval." }, { status: 400 })
    }

    const resolvedApproval = await prisma.$transaction(async (tx) => {
      // 1. Update Approval status
      const updatedApproval = await tx.approval.update({
        where: { id: approvalId },
        data: {
          status: action === "APPROVE" ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
          comments: comments || (action === "APPROVE" ? "Approved by Manager" : "Rejected by Manager"),
        },
      })

      // 2. Update Purchase Order status
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: action === "APPROVE" ? PurchaseOrderStatus.APPROVED : PurchaseOrderStatus.REJECTED,
        },
      })

      return updatedApproval
    })

    // 3. Action specific pipelines (Approve vs Reject)
    if (action === "APPROVE") {
      // Trigger Supplier Email: Use ProcurementAgent's email drafter to generate the email and write it to emails table as SENT
      try {
        const dbLogger = DbAgentLogger.getInstance()
        const procurementAgent = new ProcurementAgent(dbLogger)

        const firstItem = po.items[0]
        const productSku = firstItem?.product?.sku || "N/A"
        const productName = firstItem?.product?.name || "Product"
        const quantity = firstItem?.quantity || 1

        const emailTask = {
          id: `email-trigger-${Date.now()}`,
          type: "DRAFT_PO",
          description: `Generating PO email for ${po.supplier.name}`,
          input: { sku: productSku, quantity },
          createdAt: new Date(),
        }

        const context = { sessionId: `po-approve-${po.id}`, userId: "manager-approver" }
        const emailResult = await procurementAgent.execute(emailTask, context)

        let emailBody = `Dear ${po.supplier.contactName || "Team"},\n\nPlease find attached our purchase order for ${quantity}x ${productName} (SKU: ${productSku}) totaling $${Number(po.totalAmount).toFixed(2)}.\n\nBest regards,\nOpsPilot Procurement`
        let emailSubject = `Purchase Order PO-${po.id.substring(0, 8).toUpperCase()}`

        if (emailResult.status === "SUCCESS") {
          const draft = emailResult.output.supplierEmailDraft as { subject: string; body: string }
          if (draft) {
            emailSubject = draft.subject
            emailBody = draft.body
          }
        }

        // Store generated email in database with SENT status
        await prisma.email.create({
          data: {
            customerId: null,
            subject: emailSubject,
            body: emailBody,
            status: "SENT",
            priority: "HIGH",
            sender: "procurement@opspilot.ai",
            recipient: po.supplier.email,
          },
        })

        // Dispatch via EmailService — provider selected from env
        const emailService = EmailService.fromEnv()
        await emailService.sendSupplierEmail(po.supplier.email, emailSubject, emailBody)
      } catch (err) {
        console.error("[PO_APPROVE] Failed to generate/store supplier email:", err)
      }
    } else {
      // REJECT: Create Notification for manager
      await prisma.notification.create({
        data: {
          title: "Purchase Order Rejected",
          content: `Purchase Order PO-${po.id.substring(0, 8).toUpperCase()} for ${po.supplier.name} has been rejected by the manager. Comments: ${comments || "Rejected by Manager"}.`,
        },
      })

      // Notify reviewer about rejection via EmailService
      try {
        const emailService = EmailService.fromEnv()
        const rejectionBody = `A purchase order PO-${po.id.substring(0, 8).toUpperCase()} for ${po.supplier.name} has been rejected.\n\nComments: ${comments || "Rejected by Manager"}\n\nPlease review and take appropriate action.`
        await emailService.sendApprovalEmail(
          process.env.APPROVAL_REVIEWER_EMAIL || "manager@opspilot.ai",
          `Purchase Order Rejected – ${po.supplier.name}`,
          rejectionBody
        )
      } catch (err) {
        console.error("[PO_REJECT] Failed to dispatch rejection notification email:", err)
      }
    }

    return NextResponse.json({ status: "success", data: resolvedApproval })
  } catch (error) {
    console.error("[POST /api/approvals/resolve] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
