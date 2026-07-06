/**
 * GmailProvider
 *
 * Sends emails via Gmail SMTP using a Google App Password.
 * No custom domain required — works with any Gmail or Google Workspace account.
 *
 * Setup (5 minutes):
 *   1. Create a Gmail account (e.g. yourapp.ops@gmail.com)
 *   2. Enable 2-Step Verification on that account
 *   3. Go to myaccount.google.com → Security → App Passwords
 *   4. Generate an app password for "Mail" → copy the 16-character code
 *   5. Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env
 */

import nodemailer from "nodemailer"
import { EmailProvider, SendEmailPayload } from "../types"

export class GmailProvider implements EmailProvider {
  private transporter: nodemailer.Transporter
  private fromAddress: string

  constructor(gmailUser?: string, appPassword?: string) {
    const user = gmailUser     || process.env.GMAIL_USER         || ""
    const pass = appPassword   || process.env.GMAIL_APP_PASSWORD || ""
    this.fromAddress = user

    this.transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    })
  }

  async send(payload: SendEmailPayload): Promise<boolean> {
    if (!this.fromAddress || !process.env.GMAIL_APP_PASSWORD) {
      console.warn("[GmailProvider] Missing GMAIL_USER or GMAIL_APP_PASSWORD. Email not sent.")
      console.log(`[Gmail Fallback] To: ${payload.to}, Subject: ${payload.subject}`)
      return false
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"OpsPilot AI" <${this.fromAddress}>`,
        to:      payload.to,
        subject: payload.subject,
        // Prefer rendered HTML from templates; fall back to plain text wrapped in div
        html:    payload.html ?? `<div style="font-family:sans-serif;white-space:pre-wrap">${payload.body}</div>`,
        text:    payload.body,
      })

      console.log(`[GmailProvider] Email sent. Message ID: ${info.messageId}`)
      return true
    } catch (err) {
      console.error("[GmailProvider] Failed to send email:", err)
      return false
    }
  }
}
