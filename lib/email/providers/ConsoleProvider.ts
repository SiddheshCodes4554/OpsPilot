import { EmailProvider, SendEmailPayload } from "../types"

export class ConsoleProvider implements EmailProvider {
  async send(payload: SendEmailPayload): Promise<boolean> {
    console.log("=========================================")
    console.log(`[ConsoleEmailProvider] SENDING EMAIL`)
    console.log(`FROM:    ${payload.from}`)
    console.log(`TO:      ${payload.to}`)
    console.log(`SUBJECT: ${payload.subject}`)
    console.log(`BODY:\n${payload.body}`)
    if (payload.meta) {
      console.log(`META:    `, JSON.stringify(payload.meta))
    }
    console.log("=========================================")
    return true
  }
}
