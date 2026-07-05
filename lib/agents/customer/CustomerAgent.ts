import { Task, AgentResult, AgentContext, ExecutionLog } from "../shared/types"
import { IAgentLogger } from "../../logger/types"
import { AgentLogger } from "../../logger/AgentLogger"
import { GroqService } from "../../ai/GroqService"
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE, OUTPUT_SCHEMA } from "../../prompts/customer"

export class CustomerAgent {
  private agentName = "CustomerAgent"
  private logger: IAgentLogger
  private groqService: GroqService

  constructor(logger?: IAgentLogger) {
    this.logger = logger ?? AgentLogger.getInstance()
    this.groqService = GroqService.getInstance()
  }

  /**
   * Executes customer email analysis using Groq and the Prompt Engine.
   * Extracts customerName, intent, priority, product, quantity, and urgency.
   * Performs no database or inventory operations.
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

    log(`Received customer email task (Session: ${context.sessionId})`)

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

      log(`Preparing prompts for email classification...`)
      
      const messages = [
        { role: "system" as const, content: SYSTEM_PROMPT },
        { role: "user" as const, content: USER_PROMPT_TEMPLATE({ subject: emailSubject, body: emailBody }) },
      ]

      log(`Invoking Groq service for structured JSON extraction...`)

      // Run structured analysis using Groq and validate with Zod schema
      const analysis = await this.groqService.chatStructured(
        messages,
        OUTPUT_SCHEMA,
        { temperature: 0.1 }
      )

      log(`Email analyzed successfully. Customer Name: "${analysis.customerName}", Intent: "${analysis.intent}"`)

      const result: AgentResult = {
        agentName: this.agentName,
        status: "SUCCESS",
        output: analysis as Record<string, unknown>,
        logs,
      }

      this.logger.logSuccess(executionId, analysis.confidence, result.output)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`Email analysis failed: ${message}`, "ERROR")
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
