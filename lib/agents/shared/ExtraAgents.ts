import { z } from "zod"
import { Task, AgentResult, AgentContext, ExecutionLog, IAgent } from "./types"
import { IAgentLogger } from "../../logger/types"
import { AgentLogger } from "../../logger/AgentLogger"
import { GroqService } from "../../ai/GroqService"

// Helper to write conversational replies using Groq
async function generateDraftReply(
  agentName: string,
  groqService: GroqService,
  personaPrompt: string,
  subject: string,
  body: string
): Promise<string> {
  const messages = [
    {
      role: "system" as const,
      content: `${personaPrompt}\nDraft a professional, concise email reply to the customer's email. Output ONLY the response body text. No metadata, subject lines, or markup.`,
    },
    {
      role: "user" as const,
      content: `Subject: ${subject}\nBody:\n${body}`,
    },
  ]

  const outputSchema = z.object({
    replyText: z.string().describe("The drafted response text for the customer."),
  })

  const result = await groqService.chatStructured(messages, outputSchema, { temperature: 0.7 })
  return result.replyText
}

// 1. Knowledge Agent
export class KnowledgeAgent implements IAgent {
  private agentName = "KnowledgeAgent"
  private logger: IAgentLogger
  private groqService: GroqService

  constructor(logger?: IAgentLogger) {
    this.logger = logger ?? AgentLogger.getInstance()
    this.groqService = GroqService.getInstance()
  }

  async execute(task: Task, context: AgentContext): Promise<AgentResult> {
    const logs: ExecutionLog[] = []
    const log = (message: string, level: ExecutionLog["level"] = "INFO") => {
      logs.push({ agentName: this.agentName, level, message, timestamp: new Date() })
    }
    const executionId = this.logger.logStart(this.agentName, task.type, task.input as Record<string, unknown>)
    log(`KnowledgeAgent evaluating product inquiry (Session: ${context.sessionId})`)

    try {
      const { subject = "", body = "" } = task.input as { subject?: string; body?: string }
      const reply = await generateDraftReply(
        this.agentName,
        this.groqService,
        "You are an expert product specialist. Address customer inquiries with precise technical details and product specs.",
        subject,
        body
      )

      log(`KnowledgeAgent generated reply.`)
      const result: AgentResult = { agentName: this.agentName, status: "SUCCESS", output: { reply }, logs }
      this.logger.logSuccess(executionId, 0.95, result.output)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`KnowledgeAgent failed: ${message}`, "ERROR")
      this.logger.logFailure(executionId, message)
      return { agentName: this.agentName, status: "FAILURE", output: {}, errors: [message], logs }
    }
  }
}

// 2. Warranty Agent
export class WarrantyAgent implements IAgent {
  private agentName = "WarrantyAgent"
  private logger: IAgentLogger
  private groqService: GroqService

  constructor(logger?: IAgentLogger) {
    this.logger = logger ?? AgentLogger.getInstance()
    this.groqService = GroqService.getInstance()
  }

  async execute(task: Task, _context: AgentContext): Promise<AgentResult> {
    const logs: ExecutionLog[] = []
    const log = (message: string, level: ExecutionLog["level"] = "INFO") => {
      logs.push({ agentName: this.agentName, level, message, timestamp: new Date() })
    }
    const executionId = this.logger.logStart(this.agentName, task.type, task.input as Record<string, unknown>)
    log(`WarrantyAgent checking policy claim details (Session: ${_context.sessionId})...`)

    try {
      const { subject = "", body = "" } = task.input as { subject?: string; body?: string }
      const reply = await generateDraftReply(
        this.agentName,
        this.groqService,
        "You are a helpful warranty claim processor. Draft a response validating if the claim details match standard 1-year limited warranties, and request pictures if needed.",
        subject,
        body
      )

      log(`WarrantyAgent created claim draft response.`)
      const result: AgentResult = { agentName: this.agentName, status: "SUCCESS", output: { reply }, logs }
      this.logger.logSuccess(executionId, 0.96, result.output)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`WarrantyAgent failed: ${message}`, "ERROR")
      this.logger.logFailure(executionId, message)
      return { agentName: this.agentName, status: "FAILURE", output: {}, errors: [message], logs }
    }
  }
}

// 3. Refund Agent
export class RefundAgent implements IAgent {
  private agentName = "RefundAgent"
  private logger: IAgentLogger
  private groqService: GroqService

  constructor(logger?: IAgentLogger) {
    this.logger = logger ?? AgentLogger.getInstance()
    this.groqService = GroqService.getInstance()
  }

  async execute(task: Task, _context: AgentContext): Promise<AgentResult> {
    const logs: ExecutionLog[] = []
    const log = (message: string, level: ExecutionLog["level"] = "INFO") => {
      logs.push({ agentName: this.agentName, level, message, timestamp: new Date() })
    }
    const executionId = this.logger.logStart(this.agentName, task.type, task.input as Record<string, unknown>)
    log(`RefundAgent preparing claim review (Session: ${_context.sessionId})...`)

    try {
      const { subject = "", body = "" } = task.input as { subject?: string; body?: string }
      const reply = await generateDraftReply(
        this.agentName,
        this.groqService,
        "You are a customer refunds specialist. Draft a message confirming that their request has been submitted to the manager for validation, and will be settled in 3-5 days.",
        subject,
        body
      )

      log(`RefundAgent drafted customer update.`)
      const result: AgentResult = { agentName: this.agentName, status: "SUCCESS", output: { reply }, logs }
      this.logger.logSuccess(executionId, 0.94, result.output)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`RefundAgent failed: ${message}`, "ERROR")
      this.logger.logFailure(executionId, message)
      return { agentName: this.agentName, status: "FAILURE", output: {}, errors: [message], logs }
    }
  }
}

// 4. Return Agent
export class ReturnAgent implements IAgent {
  private agentName = "ReturnAgent"
  private logger: IAgentLogger
  private groqService: GroqService

  constructor(logger?: IAgentLogger) {
    this.logger = logger ?? AgentLogger.getInstance()
    this.groqService = GroqService.getInstance()
  }

  async execute(task: Task, _context: AgentContext): Promise<AgentResult> {
    const logs: ExecutionLog[] = []
    const log = (message: string, level: ExecutionLog["level"] = "INFO") => {
      logs.push({ agentName: this.agentName, level, message, timestamp: new Date() })
    }
    const executionId = this.logger.logStart(this.agentName, task.type, task.input as Record<string, unknown>)
    log(`ReturnAgent evaluating return window (Session: ${_context.sessionId})...`)

    try {
      const { subject = "", body = "" } = task.input as { subject?: string; body?: string }
      const reply = await generateDraftReply(
        this.agentName,
        this.groqService,
        "You are an RMA/Return processor. Draft a reply providing returning instructions, packaging guidelines, and a placeholder link to print pre-paid shipping labels.",
        subject,
        body
      )

      log(`ReturnAgent drafted return label update.`)
      const result: AgentResult = { agentName: this.agentName, status: "SUCCESS", output: { reply }, logs }
      this.logger.logSuccess(executionId, 0.95, result.output)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`ReturnAgent failed: ${message}`, "ERROR")
      this.logger.logFailure(executionId, message)
      return { agentName: this.agentName, status: "FAILURE", output: {}, errors: [message], logs }
    }
  }
}

// 5. Support Agent (for COMPLAINT)
export class SupportAgent implements IAgent {
  private agentName = "SupportAgent"
  private logger: IAgentLogger
  private groqService: GroqService

  constructor(logger?: IAgentLogger) {
    this.logger = logger ?? AgentLogger.getInstance()
    this.groqService = GroqService.getInstance()
  }

  async execute(task: Task, _context: AgentContext): Promise<AgentResult> {
    const logs: ExecutionLog[] = []
    const log = (message: string, level: ExecutionLog["level"] = "INFO") => {
      logs.push({ agentName: this.agentName, level, message, timestamp: new Date() })
    }
    const executionId = this.logger.logStart(this.agentName, task.type, task.input as Record<string, unknown>)
    log(`SupportAgent handling customer complaint (Session: ${_context.sessionId})...`)

    try {
      const { subject = "", body = "" } = task.input as { subject?: string; body?: string }
      const reply = await generateDraftReply(
        this.agentName,
        this.groqService,
        "You are a dedicated support manager. Express sincere apologies for the inconvenience, outline immediate steps being taken, and offer a $15 store coupon.",
        subject,
        body
      )

      log(`SupportAgent drafted complaint reconciliation.`)
      const result: AgentResult = { agentName: this.agentName, status: "SUCCESS", output: { reply }, logs }
      this.logger.logSuccess(executionId, 0.92, result.output)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`SupportAgent failed: ${message}`, "ERROR")
      this.logger.logFailure(executionId, message)
      return { agentName: this.agentName, status: "FAILURE", output: {}, errors: [message], logs }
    }
  }
}

// 6. Customer Response Agent (for GENERAL)
export class CustomerResponseAgent implements IAgent {
  private agentName = "CustomerResponseAgent"
  private logger: IAgentLogger
  private groqService: GroqService

  constructor(logger?: IAgentLogger) {
    this.logger = logger ?? AgentLogger.getInstance()
    this.groqService = GroqService.getInstance()
  }

  async execute(task: Task, _context: AgentContext): Promise<AgentResult> {
    const logs: ExecutionLog[] = []
    const log = (message: string, level: ExecutionLog["level"] = "INFO") => {
      logs.push({ agentName: this.agentName, level, message, timestamp: new Date() })
    }
    const executionId = this.logger.logStart(this.agentName, task.type, task.input as Record<string, unknown>)
    log(`CustomerResponseAgent responding to general email (Session: ${_context.sessionId})...`)

    try {
      const { subject = "", body = "" } = task.input as { subject?: string; body?: string }
      const reply = await generateDraftReply(
        this.agentName,
        this.groqService,
        "You are a friendly workspace relations representative. Draft a pleasant response thanking the user for writing in, and invite them to ask more questions if needed.",
        subject,
        body
      )

      log(`CustomerResponseAgent drafted general reply.`)
      const result: AgentResult = { agentName: this.agentName, status: "SUCCESS", output: { reply }, logs }
      this.logger.logSuccess(executionId, 0.95, result.output)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`CustomerResponseAgent failed: ${message}`, "ERROR")
      this.logger.logFailure(executionId, message)
      return { agentName: this.agentName, status: "FAILURE", output: {}, errors: [message], logs }
    }
  }
}
