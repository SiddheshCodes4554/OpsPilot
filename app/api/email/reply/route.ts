/**
 * POST /api/email/reply
 *
 * Validates input, renders the appropriate branded email template,
 * dispatches via EmailService, and persists the record to the database.
 *
 * Does NOT invoke any agents. Production-ready with full error handling.
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { EmailService } from "@/lib/email/EmailService"
import { renderTemplate } from "@/lib/email/templates"
import {
  buildCustomerReplyTemplate,
  buildApprovalRequestTemplate,
  buildInventoryAlertTemplate,
} from "@/lib/email/templates"
import { EmailPriority } from "@prisma/client"

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

/**
 * Supported email reply types.
 *
 * - CUSTOMER_REPLY:      General reply to a customer inquiry.
 * - SUPPLIER_REPLY:      Acknowledgement or response to a supplier email.
 * - APPROVAL_REQUEST:    Notify a reviewer that an action requires their approval.
 * - INVENTORY_ALERT:     Alert stakeholders about a stock-level issue.
 * - NOTIFICATION:        Generic workspace notification email.
 * - ORDER_CONFIRMATION:  Confirm a placed customer order.
 * - WARRANTY_RESPONSE:   Response to a warranty or repair claim.
 * - PRODUCT_INQUIRY:     Answer to a product specification question.
 * - REFUND:              Acknowledgement of a refund request.
 * - COMPLAINT:           Response to a customer complaint.
 * - GENERAL:             Catch-all for shipping, general, and UNKNOWN intents.
 */
const EmailTypeEnum = z.enum([
  "CUSTOMER_REPLY",
  "SUPPLIER_REPLY",
  "APPROVAL_REQUEST",
  "INVENTORY_ALERT",
  "NOTIFICATION",
  "ORDER_CONFIRMATION",
  "WARRANTY_RESPONSE",
  "PRODUCT_INQUIRY",
  "REFUND",
  "COMPLAINT",
  "GENERAL",
])

const ReplyRequestSchema = z.object({
  /** Destination email address */
  recipient: z
    .string("recipient is required")
    .email("recipient must be a valid email address"),

  /** Email subject line */
  subject: z
    .string("subject is required")
    .min(2, "subject must be at least 2 characters")
    .max(200, "subject must not exceed 200 characters"),

  /** Main body / message content */
  body: z
    .string("body is required")
    .min(5, "body must be at least 5 characters")
    .max(10_000, "body must not exceed 10,000 characters"),

  /** Template type that controls branding, layout, and from-address */
  type: EmailTypeEnum,

  /**
   * Optional name of the recipient — used inside the template greeting.
   * Falls back to the local-part of the email if omitted.
   */
  recipientName: z.string().max(100).optional(),

  /**
   * Priority stored in the database record.
   * Defaults to MEDIUM.
   */
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
})

type ReplyRequest = z.infer<typeof ReplyRequestSchema>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive a display name from an email address when no explicit name is given. */
function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

/**
 * Map EmailType → EmailService category.
 * Determines which from-address and provider metadata category is used.
 */
type ServiceCategory = "customer" | "supplier" | "approval" | "notification"

const typeToCategory: Record<ReplyRequest["type"], ServiceCategory> = {
  CUSTOMER_REPLY: "customer",
  SUPPLIER_REPLY: "supplier",
  APPROVAL_REQUEST: "approval",
  INVENTORY_ALERT: "notification",
  NOTIFICATION: "notification",
  ORDER_CONFIRMATION: "customer",
  WARRANTY_RESPONSE: "customer",
  PRODUCT_INQUIRY: "customer",
  REFUND: "customer",
  COMPLAINT: "customer",
  GENERAL: "customer",
}

/** From-address per category (mirrors EmailService internals for DB storage). */
const categoryFromAddress: Record<ServiceCategory, string> = {
  customer: process.env.EMAIL_FROM_CUSTOMER ?? "support@opspilot.ai",
  supplier: process.env.EMAIL_FROM_SUPPLIER ?? "procurement@opspilot.ai",
  approval: process.env.EMAIL_FROM_APPROVAL ?? "approvals@opspilot.ai",
  notification: process.env.EMAIL_FROM_NOTIFICATION ?? "alerts@opspilot.ai",
}

const typePriority: Record<ReplyRequest["type"], EmailPriority> = {
  CUSTOMER_REPLY: "MEDIUM",
  SUPPLIER_REPLY: "MEDIUM",
  APPROVAL_REQUEST: "HIGH",
  INVENTORY_ALERT: "HIGH",
  NOTIFICATION: "LOW",
  ORDER_CONFIRMATION: "MEDIUM",
  WARRANTY_RESPONSE: "MEDIUM",
  PRODUCT_INQUIRY: "LOW",
  REFUND: "HIGH",
  COMPLAINT: "HIGH",
  GENERAL: "LOW",
}

// ---------------------------------------------------------------------------
// Template selector
// ---------------------------------------------------------------------------

/** Builds the typed template descriptor for the given request. */
function buildTemplateDescriptor(req: ReplyRequest) {
  const recipientName = req.recipientName ?? nameFromEmail(req.recipient)

  switch (req.type) {
    case "CUSTOMER_REPLY":
      return buildCustomerReplyTemplate({
        customerName: recipientName,
        originalSubject: req.subject,
        replyBody: req.body,
      })

    case "ORDER_CONFIRMATION":
      return buildCustomerReplyTemplate({
        customerName: recipientName,
        originalSubject: req.subject,
        replyBody: req.body,
        agentName: "OpsPilot Orders",
      })

    case "WARRANTY_RESPONSE":
      return buildCustomerReplyTemplate({
        customerName: recipientName,
        originalSubject: req.subject,
        replyBody: req.body,
        agentName: "OpsPilot Warranty",
      })

    case "PRODUCT_INQUIRY":
      return buildCustomerReplyTemplate({
        customerName: recipientName,
        originalSubject: req.subject,
        replyBody: req.body,
        agentName: "OpsPilot Product Specialist",
      })

    case "REFUND":
      return buildCustomerReplyTemplate({
        customerName: recipientName,
        originalSubject: req.subject,
        replyBody: req.body,
        agentName: "OpsPilot Billing",
      })

    case "COMPLAINT":
      return buildCustomerReplyTemplate({
        customerName: recipientName,
        originalSubject: req.subject,
        replyBody: req.body,
        agentName: "OpsPilot Customer Relations",
      })

    case "GENERAL":
      return buildCustomerReplyTemplate({
        customerName: recipientName,
        originalSubject: req.subject,
        replyBody: req.body,
        agentName: "OpsPilot Support",
      })

    case "SUPPLIER_REPLY":
      return buildCustomerReplyTemplate({
        customerName: recipientName,
        originalSubject: req.subject,
        replyBody: req.body,
        agentName: "OpsPilot Procurement",
      })

    case "APPROVAL_REQUEST":
      return buildApprovalRequestTemplate({
        approvalId: `APPR-${Date.now().toString(36).toUpperCase()}`,
        type: "CUSTOM",
        reviewerName: recipientName,
        requesterName: "OpsPilot System",
        requesterEmail: "system@opspilot.ai",
        summary: req.body,
        details: { "Regarding": req.subject },
      })

    case "INVENTORY_ALERT":
      return buildInventoryAlertTemplate({
        severity: req.priority === "HIGH" ? "CRITICAL" : "WARNING",
        recipientName,
        alertTitle: req.subject,
        alertMessage: req.body,
        items: [],
      })

    case "NOTIFICATION":
      return buildCustomerReplyTemplate({
        customerName: recipientName,
        originalSubject: req.subject,
        replyBody: req.body,
        agentName: "OpsPilot Notifications",
      })
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Parse & validate input
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        status: "error",
        code: "INVALID_JSON",
        message: "Request body must be valid JSON.",
      },
      { status: 400 }
    )
  }

  const parseResult = ReplyRequestSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      {
        status: "error",
        code: "VALIDATION_FAILED",
        message: "Request validation failed.",
        errors: parseResult.error.flatten().fieldErrors,
      },
      { status: 422 }
    )
  }

  const req = parseResult.data
  const category = typeToCategory[req.type]
  const fromAddress = categoryFromAddress[category]
  const dbPriority: EmailPriority = typePriority[req.type]

  // 2. Generate template
  let rendered: { subject: string; html: string; text: string }
  try {
    const descriptor = buildTemplateDescriptor(req)
    rendered = await renderTemplate(descriptor)
  } catch (err) {
    console.error("[POST /api/email/reply] Template render failed:", err)
    return NextResponse.json(
      {
        status: "error",
        code: "TEMPLATE_RENDER_FAILED",
        message: "Failed to generate email template.",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }

  // 3. Resolve customer FK (optional — no FK required for supplier/notification types)
  let customerId: string | null = null
  if (category === "customer") {
    try {
      const customer = await prisma.customer.findUnique({
        where: { email: req.recipient },
        select: { id: true },
      })
      customerId = customer?.id ?? null
    } catch {
      // Non-fatal: customer lookup failure should not abort sending
    }
  }

  // 4. Dispatch via EmailService
  let dispatched = false
  try {
    const emailService = EmailService.fromEnv()
    dispatched = await emailService.sendRendered(req.recipient, rendered, category)
  } catch (err) {
    console.error("[POST /api/email/reply] EmailService dispatch failed:", err)
    // Continue to save the record as FAILED — do not abort the request
  }

  // 5. Persist to database
  let savedEmail: { id: string; createdAt: Date }
  try {
    savedEmail = await prisma.email.create({
      data: {
        customerId,
        subject: rendered.subject,
        body: req.body,
        status: dispatched ? "SENT" : "FAILED",
        priority: dbPriority,
        sender: fromAddress,
        recipient: req.recipient,
      },
      select: { id: true, createdAt: true },
    })
  } catch (err) {
    console.error("[POST /api/email/reply] Database persist failed:", err)
    return NextResponse.json(
      {
        status: "error",
        code: "DATABASE_ERROR",
        message: "Email was dispatched but could not be saved to the database.",
        dispatched,
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }

  // 6. Return result
  if (!dispatched) {
    return NextResponse.json(
      {
        status: "partial",
        code: "DISPATCH_FAILED",
        message:
          "Email was saved but could not be dispatched. Check EMAIL_PROVIDER configuration.",
        data: {
          emailId: savedEmail.id,
          recipient: req.recipient,
          subject: rendered.subject,
          type: req.type,
          dispatched: false,
          createdAt: savedEmail.createdAt,
        },
      },
      { status: 202 }
    )
  }

  return NextResponse.json(
    {
      status: "success",
      data: {
        emailId: savedEmail.id,
        recipient: req.recipient,
        subject: rendered.subject,
        type: req.type,
        category,
        dispatched: true,
        createdAt: savedEmail.createdAt,
      },
    },
    { status: 200 }
  )
}
