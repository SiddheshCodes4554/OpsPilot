import { EmailProvider, SendEmailPayload } from "../types"

export class ResendProvider implements EmailProvider {
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.RESEND_API_KEY || ""
  }

  async send(payload: SendEmailPayload): Promise<boolean> {
    if (!this.apiKey) {
      console.warn("[ResendEmailProvider] Missing RESEND_API_KEY. Falling back to log trace.")
      console.log(`[Resend Fallback] From: ${payload.from}, To: ${payload.to}, Subject: ${payload.subject}`)
      return false
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: payload.from,
          to: payload.to,
          subject: payload.subject,
          // Prefer structured HTML from templates; fallback to wrapped plain text
          html: payload.html ?? `<div style="font-family: sans-serif; white-space: pre-wrap;">${payload.body}</div>`,
          text: payload.body,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(JSON.stringify(errorData))
      }

      const data = (await res.json()) as { id: string }
      console.log(`[ResendEmailProvider] Email sent successfully. Message ID: ${data.id}`)
      return true
    } catch (error) {
      console.error("[ResendEmailProvider] Failed to send email via Resend API:", error)
      return false
    }
  }
}
