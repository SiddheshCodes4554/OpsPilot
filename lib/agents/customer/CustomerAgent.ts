import { prisma } from "@/lib/prisma"
import { EmailStatus, EmailPriority } from "@prisma/client"
import { Task, AgentResult, AgentContext, ExecutionLog } from "../shared/types"
import { IAgentLogger } from "../../logger/types"
import { AgentLogger } from "../../logger/AgentLogger"

export class CustomerAgent {
  private agentName = "CustomerAgent"
  private logger: IAgentLogger

  constructor(logger?: IAgentLogger) {
    this.logger = logger ?? AgentLogger.getInstance()
  }

  /**
   * Executes customer-related CRM operations.
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

    log(`Received customer task: "${task.type}" - "${task.description}" (Session: ${context.sessionId})`)

    try {
      switch (task.type) {
        case "CUSTOMER_LOOKUP": {
          const { email } = task.input as { email?: string }
          if (!email) {
            throw new Error("Missing customer email in input.")
          }
          log(`Looking up customer profile for: ${email}`)

          const customer = await prisma.customer.findUnique({
            where: { email },
            include: {
              orders: {
                take: 5,
                orderBy: { createdAt: "desc" },
              },
              emails: {
                take: 5,
                orderBy: { createdAt: "desc" },
              },
            },
          })

          if (!customer) {
            log(`Customer not found for email: ${email}`, "WARN")
            const result: AgentResult = {
              agentName: this.agentName,
              status: "SUCCESS",
              output: { found: false },
              logs,
            }
            this.logger.logSuccess(executionId, 1.0, result.output)
            return result
          }

          log(`Customer found: "${customer.name}" associated with company "${customer.company || "N/A"}"`)
          const result: AgentResult = {
            agentName: this.agentName,
            status: "SUCCESS",
            output: { found: true, customer },
            logs,
          }
          this.logger.logSuccess(executionId, 1.0, result.output)
          return result
        }

        case "LOG_CUSTOMER_EMAIL": {
          const { email, subject, body, status, priority } = task.input as {
            email?: string
            subject?: string
            body?: string
            status?: string
            priority?: string
          }
          if (!email || !subject || !body) {
            throw new Error("Missing required inputs (email, subject, body).")
          }

          log(`Logging support communication from: ${email}`)
          const customer = await prisma.customer.findUnique({ where: { email } })

          const newEmail = await prisma.email.create({
            data: {
              subject,
              body,
              status: (status || "RECEIVED") as EmailStatus,
              priority: (priority || "MEDIUM") as EmailPriority,
              sender: email,
              recipient: "support@opspilot.ai",
              customer: customer ? { connect: { id: customer.id } } : undefined,
            },
          })

          log(`Communication successfully logged with ID: ${newEmail.id}`)
          const result: AgentResult = {
            agentName: this.agentName,
            status: "SUCCESS",
            output: { logged: true, emailId: newEmail.id, email: newEmail },
            logs,
          }
          this.logger.logSuccess(executionId, 1.0, result.output)
          return result
        }

        default:
          throw new Error(`Unsupported task type "${task.type}" for CustomerAgent.`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`Execution failed: ${message}`, "ERROR")
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
