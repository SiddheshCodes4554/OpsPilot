import { Task, AgentResult, AgentContext, ExecutionLog, IAgent } from "../shared/types"
import { IAgentLogger } from "../../logger/types"
import { AgentLogger } from "../../logger/AgentLogger"
import { GroqService } from "../../ai/GroqService"
import { REPLY_PARSER_SYSTEM_PROMPT, REPLY_PARSER_USER_TEMPLATE, REPLY_PARSER_SCHEMA } from "../../prompts/supplier"

export class SupplierAgent implements IAgent {
  private agentName = "SupplierAgent"
  private logger: IAgentLogger
  private groqService: GroqService

  constructor(logger?: IAgentLogger) {
    this.logger = logger ?? AgentLogger.getInstance()
    this.groqService = GroqService.getInstance()
  }

  /**
   * Executes supplier email reply analysis.
   * Extracts deliveryDate, invoiceNumber, priceConfirmed, and confirmed status.
   * Performs no database operations.
   */
  async execute(task: Task, context: AgentContext): Promise<AgentResult> {
    const logs: ExecutionLog[] = []
    const log = (message: string, level: ExecutionLog["level"] = "INFO") => {
      logs.push({ agentName: this.agentName, level, message, timestamp: new Date() })
    }

    const executionId = this.logger.logStart(
      this.agentName,
      task.type,
      task.input as Record<string, unknown>
    )

    log(`Received supplier email reply task (Session: ${context.sessionId})`)

    try {
      const { subject, body, emailText } = task.input as {
        subject?: string
        body?: string
        emailText?: string
      }

      const emailBody = body || emailText || ""
      const emailSubject = subject || "No Subject"

      if (!emailBody && !emailSubject) {
        throw new Error("Missing email content (subject or body) in input.")
      }

      log(`Preparing prompts for supplier reply classification...`)

      const messages = [
        { role: "system" as const, content: REPLY_PARSER_SYSTEM_PROMPT },
        { role: "user" as const, content: REPLY_PARSER_USER_TEMPLATE({ subject: emailSubject, body: emailBody }) },
      ]

      log(`Invoking Groq service for supplier email reply parsing...`)

      // Run structured analysis using Groq and validate with Zod schema
      const analysis = await this.groqService.chatStructured(
        messages,
        REPLY_PARSER_SCHEMA,
        { temperature: 0.1 }
      )

      log(`Supplier reply analyzed successfully. Confirmed: ${analysis.confirmed}, Est Delivery: "${analysis.deliveryDate}"`)

      const result: AgentResult = {
        agentName: this.agentName,
        status: "SUCCESS",
        output: analysis as unknown as Record<string, unknown>,
        logs,
      }

      this.logger.logSuccess(executionId, analysis.confidence, result.output)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`Supplier reply analysis failed: ${message}`, "ERROR")
      this.logger.logFailure(executionId, err instanceof Error ? err : message)
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
