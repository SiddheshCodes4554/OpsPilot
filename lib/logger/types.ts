export type AgentLogStatus = "SUCCESS" | "FAILURE" | "IN_PROGRESS"

export interface AgentLogEntry {
  id: string
  agentName: string
  action: string
  startedAt: Date
  completedAt: Date | null
  duration: number | null     // Duration in milliseconds
  status: AgentLogStatus
  confidence: number | null
  metadata: Record<string, unknown> | null
}

export interface IAgentLogger {
  /**
   * Logs the initiation of an agent action.
   * Returns a unique executionId string.
   */
  logStart(agentName: string, action: string, metadata?: Record<string, unknown>): string

  /**
   * Logs the successful completion of an agent action.
   */
  logSuccess(executionId: string, confidence?: number, metadata?: Record<string, unknown>): void

  /**
   * Logs the failure of an agent action.
   */
  logFailure(executionId: string, error: Error | string, metadata?: Record<string, unknown>): void

  /**
   * Retrieves all log entries matching the criteria.
   */
  getLogs(agentName?: string, executionId?: string): AgentLogEntry[]
}
