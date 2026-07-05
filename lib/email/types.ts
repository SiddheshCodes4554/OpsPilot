export interface SendEmailPayload {
  to: string
  from: string
  subject: string
  /** Plain-text body (always required, used as fallback) */
  body: string
  /** Optional HTML body — providers should prefer this when available */
  html?: string
  meta?: Record<string, unknown>
}

export interface EmailProvider {
  send(payload: SendEmailPayload): Promise<boolean>
}
