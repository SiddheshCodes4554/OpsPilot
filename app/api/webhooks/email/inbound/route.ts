/**
 * POST /api/webhooks/email/inbound
 *
 * Receives inbound emails forwarded by Resend (or any MX-based webhook provider)
 * and pipes them directly into ManagerAgent — identical to what the inbox simulator does.
 *
 * Setup:
 *   1. Add MX record: mx.resend.com → your domain (e.g. support@yourco.com)
 *   2. Create Inbound Route in Resend dashboard → point to this URL
 *   3. Set RESEND_WEBHOOK_SECRET in .env
 *   4. Deploy and enjoy zero-touch email automation.
 *
 * Security:
 *   Resend signs every webhook with a shared secret sent as the
 *   "webhook-id", "webhook-timestamp" and "webhook-signature" headers (Svix format).
 *   If RESEND_WEBHOOK_SECRET is set we verify the signature; otherwise we
 *   fall back to a simpler bearer-token check via INBOUND_WEBHOOK_TOKEN.
 *   Neither mode is skipped — one of the two MUST be configured in production.
 */

import { NextResponse } from "next/server"
import { waitUntil } from "@vercel/functions"
import { CustomerAgent } from "@/lib/agents/customer/CustomerAgent"
import { InventoryAgent } from "@/lib/agents/inventory/InventoryAgent"
import { ProcurementAgent } from "@/lib/agents/procurement/ProcurementAgent"
import { SupplierAgent } from "@/lib/agents/supplier/SupplierAgent"
import { AnalyticsAgent } from "@/lib/agents/analytics/AnalyticsAgent"
import { ManagerAgent } from "@/lib/agents/manager/ManagerAgent"
import { DbAgentLogger } from "@/lib/logger/DbAgentLogger"
import { prisma } from "@/lib/prisma"

/**
 * Vercel: give the function up to 60 seconds to complete the agent pipeline.
 * Requires Vercel Pro or higher. On Hobby the limit is 10s — the webhook will
 * still return 200 immediately; only very slow agent runs will be truncated.
 */
export const maxDuration = 60

// ---------------------------------------------------------------------------
// Payload types – Resend inbound email schema
// ---------------------------------------------------------------------------

interface ResendInboundPayload {
  type: string           // "email.received" | "inbound_email"
  created_at?: string
  data?: {
    email_id?: string
    from?: string
    to?: string | string[]
    subject?: string
    html?: string
    text?: string
    headers?: Record<string, string>
  }
  // Some providers send fields at the top level
  from?: string
  to?: string | string[]
  subject?: string
  html?: string
  text?: string
}

// ---------------------------------------------------------------------------
// Signature verification helpers
// ---------------------------------------------------------------------------

/**
 * Verify Resend/Svix webhook signature.
 * Resend signs with HMAC-SHA256 using the scheme:
 *   `v1,<base64(HMAC(webhook-id + "\n" + webhook-timestamp + "\n" + rawBody))>`
 */
async function verifySvixSignature(
  secret: string,
  headers: Headers,
  rawBody: string
): Promise<boolean> {
  const msgId        = headers.get("webhook-id")        ?? ""
  const msgTimestamp = headers.get("webhook-timestamp") ?? ""
  const msgSignature = headers.get("webhook-signature") ?? ""

  if (!msgId || !msgTimestamp || !msgSignature) return false

  // Reject timestamps older than 5 minutes
  const ts = parseInt(msgTimestamp, 10)
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

  const signingPayload = `${msgId}\n${msgTimestamp}\n${rawBody}`

  // The secret is prefixed with "whsec_" and base64-encoded
  const keyData = secret.startsWith("whsec_")
    ? atob(secret.slice(6))
    : secret

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(keyData),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const sigBytes  = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingPayload))
  const computed  = `v1,${btoa(String.fromCharCode(...new Uint8Array(sigBytes)))}`

  // The header can contain multiple space-separated signatures (rotation support)
  const provided  = msgSignature.split(" ")
  return provided.some(sig => sig === computed)
}

// ---------------------------------------------------------------------------
// Payload parser — normalises different inbound formats
// ---------------------------------------------------------------------------

interface ParsedEmail {
  from: string
  subject: string
  body: string
}

function parsePayload(payload: ResendInboundPayload): ParsedEmail | null {
  // Resend standard: data nested under payload.data
  const d = payload.data
  const from    = d?.from    ?? payload.from    ?? ""
  const subject = d?.subject ?? payload.subject ?? ""
  const body    = d?.text    ?? payload.text    ?? d?.html ?? payload.html ?? ""

  if (!from || !subject || !body) return null

  // Strip HTML tags if we only have an HTML body
  const plainBody = body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()

  return { from: from.trim(), subject: subject.trim(), body: plainBody }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // ── 1. Read raw body (needed for signature verification) ───────────────
  const rawBody = await request.text()

  // ── 2. Security verification ───────────────────────────────────────────
  const svixSecret  = process.env.RESEND_WEBHOOK_SECRET ?? ""
  const bearerToken = process.env.INBOUND_WEBHOOK_TOKEN ?? ""

  if (!svixSecret && !bearerToken) {
    console.error("[Inbound Webhook] Neither RESEND_WEBHOOK_SECRET nor INBOUND_WEBHOOK_TOKEN is set.")
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
  }

  if (svixSecret) {
    const valid = await verifySvixSignature(svixSecret, request.headers, rawBody)
    if (!valid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
    }
  } else {
    // Fallback: simple bearer token in Authorization header
    const authHeader = request.headers.get("authorization") ?? ""
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : ""
    if (token !== bearerToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  // ── 3. Parse payload ───────────────────────────────────────────────────
  let payload: ResendInboundPayload
  try {
    payload = JSON.parse(rawBody) as ResendInboundPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
  }

  // Only process inbound email events — ignore test pings etc.
  const isEmailEvent =
    payload.type?.includes("email") ||
    payload.type?.includes("inbound") ||
    payload.from !== undefined

  if (!isEmailEvent) {
    return NextResponse.json({ received: true, skipped: true })
  }

  const parsed = parsePayload(payload)
  if (!parsed) {
    return NextResponse.json({ received: true, skipped: true, reason: "incomplete_payload" })
  }

  // ── 4. Deduplicate – prevent re-processing the same inbound email ──────
  const emailId = payload.data?.email_id ?? `inbound-${Date.now()}`
  const existing = await prisma.email.findFirst({
    where: { body: { contains: emailId } },
    select: { id: true },
  })
  if (existing) {
    return NextResponse.json({ received: true, skipped: true, reason: "already_processed" })
  }

  // ── 5. Save inbound email record ───────────────────────────────────────
  let customer = await prisma.customer.findUnique({ where: { email: parsed.from } })
  if (!customer) {
    const name = parsed.from.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    customer = await prisma.customer.create({
      data: { email: parsed.from, name },
    })
  }

  await prisma.email.create({
    data: {
      customerId: customer.id,
      subject:    parsed.subject,
      body:       `[inbound:${emailId}] ${parsed.body}`,
      status:     "RECEIVED",
      priority:   "MEDIUM",
      sender:     parsed.from,
      recipient:  process.env.BUSINESS_EMAIL ?? "support@yourdomain.com",
    },
  })

  // ── 6. Run ManagerAgent ────────────────────────────────────────────────
  // waitUntil keeps the Vercel function alive after sending 200 so the agent
  // pipeline can complete without being killed mid-execution.
  waitUntil(runManagerAsync(parsed.from, parsed.subject, parsed.body))

  return NextResponse.json({ received: true })
}

// ---------------------------------------------------------------------------
// Async agent runner (fire-and-forget, never throws)
// ---------------------------------------------------------------------------

async function runManagerAsync(from: string, subject: string, body: string): Promise<void> {
  try {
    const dbLogger = DbAgentLogger.getInstance()

    const managerAgent = new ManagerAgent(
      new CustomerAgent(dbLogger),
      new InventoryAgent(dbLogger),
      new ProcurementAgent(dbLogger),
      new SupplierAgent(dbLogger),
      new AnalyticsAgent(dbLogger),
      undefined, undefined, undefined, undefined, undefined, undefined,
      dbLogger
    )

    const task = {
      id: `inbound-${Date.now()}`,
      type: "CUSTOMER_INQUIRY_WORKFLOW" as const,
      description: "Process inbound customer email",
      input: { email: from, subject, body },
      createdAt: new Date(),
    }

    const result = await managerAgent.execute(task, {
      sessionId: `inbound-${Date.now()}`,
      userId: "inbound-webhook",
    })

    if (result.status === "FAILURE") {
      console.error("[Inbound Webhook] ManagerAgent failed:", result.errors)
    } else {
      console.log(`[Inbound Webhook] Workflow completed: ${result.output.workflow} for ${from}`)
    }
  } catch (err) {
    console.error("[Inbound Webhook] Unhandled error in runManagerAsync:", err)
  }
}
