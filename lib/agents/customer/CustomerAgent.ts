import { prisma } from "@/lib/prisma"
import { EmailStatus, EmailPriority } from "@prisma/client"
import { Task, AgentResult, AgentContext, ExecutionLog } from "../shared/types"

export class CustomerAgent {
  private agentName = "CustomerAgent"

  /**
   * Executes customer-related CRM operations.
   */
  async execute(task: Task, context: AgentContext): Promise<AgentResult> {
    const logs: ExecutionLog[] = []
    const log = (message: string, level: ExecutionLog["level"] = "INFO") => {
      logs.push({ agentName: this.agentName, level, message, timestamp: new Date() })
    }

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
            return {
              agentName: this.agentName,
              status: "SUCCESS",
              output: { found: false },
              logs,
            }
          }

          log(`Customer found: "${customer.name}" associated with company "${customer.company || "N/A"}"`)
          return {
            agentName: this.agentName,
            status: "SUCCESS",
            output: { found: true, customer },
            logs,
          }
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
          return {
            agentName: this.agentName,
            status: "SUCCESS",
            output: { logged: true, emailId: newEmail.id, email: newEmail },
            logs,
          }
        }

        default:
          throw new Error(`Unsupported task type "${task.type}" for CustomerAgent.`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`Execution failed: ${message}`, "ERROR")
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
