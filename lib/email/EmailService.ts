import { EmailProvider } from "./types"
import { ConsoleProvider } from "./providers/ConsoleProvider"
import { ResendProvider } from "./providers/ResendProvider"
import { GmailProvider } from "./providers/GmailProvider"

export class EmailService {
  private provider: EmailProvider

  constructor(provider: EmailProvider) {
    this.provider = provider
  }

  /**
   * Factory method to instantiate EmailService based on the environment configuration.
   *
   * EMAIL_PROVIDER options:
   *   "console" — logs emails to stdout (default / dev)
   *   "gmail"   — sends via Gmail SMTP (no custom domain required)
   *   "resend"  — sends via Resend API (requires verified custom domain)
   */
  static fromEnv(): EmailService {
    const providerType = (process.env.EMAIL_PROVIDER || "console").toLowerCase()

    if (providerType === "resend") {
      return new EmailService(new ResendProvider(process.env.RESEND_API_KEY))
    }

    if (providerType === "gmail") {
      return new EmailService(new GmailProvider())
    }

    return new EmailService(new ConsoleProvider())
  }

  /**
   * Sends an email to a customer.
   */
  async sendCustomerEmail(to: string, subject: string, body: string): Promise<boolean> {
    const from = process.env.EMAIL_FROM_CUSTOMER || "support@opspilot.ai"
    return this.provider.send({
      to,
      from,
      subject,
      body,
      meta: { category: "customer" },
    })
  }

  /**
   * Sends an email to a wholesaler/supplier.
   */
  async sendSupplierEmail(to: string, subject: string, body: string): Promise<boolean> {
    const from = process.env.EMAIL_FROM_SUPPLIER || "procurement@opspilot.ai"
    return this.provider.send({
      to,
      from,
      subject,
      body,
      meta: { category: "supplier" },
    })
  }

  /**
   * Sends an email requesting a manager's approval.
   */
  async sendApprovalEmail(to: string, subject: string, body: string): Promise<boolean> {
    const from = process.env.EMAIL_FROM_APPROVAL || "approvals@opspilot.ai"
    return this.provider.send({
      to,
      from,
      subject,
      body,
      meta: { category: "approval" },
    })
  }

  /**
   * Sends workspace alert notification emails.
   */
  async sendNotificationEmail(to: string, subject: string, body: string): Promise<boolean> {
    const from = process.env.EMAIL_FROM_NOTIFICATION || "alerts@opspilot.ai"
    return this.provider.send({
      to,
      from,
      subject,
      body,
      meta: { category: "notification" },
    })
  }

  /**
   * Sends a fully rendered template email (produced by renderTemplate()).
   * Passes both structured HTML and plain-text fallback to the provider.
   *
   * @example
   *   const rendered = await renderTemplate(buildOrderConfirmationTemplate({ ... }))
   *   await emailService.sendRendered(customerEmail, rendered, "customer")
   */
  async sendRendered(
    to: string,
    rendered: { subject: string; html: string; text: string },
    category: "customer" | "supplier" | "approval" | "notification" = "notification"
  ): Promise<boolean> {
    const fromMap: Record<string, string> = {
      customer: process.env.EMAIL_FROM_CUSTOMER || "support@opspilot.ai",
      supplier: process.env.EMAIL_FROM_SUPPLIER || "procurement@opspilot.ai",
      approval: process.env.EMAIL_FROM_APPROVAL || "approvals@opspilot.ai",
      notification: process.env.EMAIL_FROM_NOTIFICATION || "alerts@opspilot.ai",
    }

    return this.provider.send({
      to,
      from: fromMap[category],
      subject: rendered.subject,
      body: rendered.text,
      html: rendered.html,
      meta: { category, templated: true },
    })
  }
}
