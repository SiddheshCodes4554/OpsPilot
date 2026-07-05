export interface SendEmailPayload {
  to: string
  from: string
  subject: string
  body: string
  meta?: Record<string, unknown>
}

export interface EmailProvider {
  send(payload: SendEmailPayload): Promise<boolean>
}
