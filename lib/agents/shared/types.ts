export type AgentStatus = "IDLE" | "BUSY" | "ERROR"

export interface Task {
  id: string
  type: string            // Type of operational task (e.g. "CUSTOMER_INQUIRY", "STOCK_CHECK", "PROCURE_GOODS", "CONSOLIDATE")
  description: string
  input: Record<string, unknown>
  createdAt: Date
}

export interface ExecutionLog {
  agentName: string
  level: "INFO" | "WARN" | "ERROR" | "DEBUG"
  message: string
  timestamp: Date
}

export interface WorkflowStep {
  id: string
  name: string
  agentName: string
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"
  input: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
  startedAt?: Date
  completedAt?: Date
}

export interface AgentResult {
  agentName: string
  status: "SUCCESS" | "FAILURE" | "IN_PROGRESS"
  output: Record<string, unknown>
  errors?: string[]
  logs: ExecutionLog[]
}

export interface AgentContext {
  userId?: string         // User initiating the agent task execution
  sessionId: string       // Trace session id
  metadata?: Record<string, unknown>
}

export interface IAgent {
  execute(task: Task, context: AgentContext): Promise<AgentResult>
}
