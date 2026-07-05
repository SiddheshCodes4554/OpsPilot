import { AgentLogEntry, IAgentLogger } from "./types"

export class AgentLogger implements IAgentLogger {
  private static instance: AgentLogger | null = null
  private logs: AgentLogEntry[] = []

  /**
   * Singleton pattern to retrieve shared logger state across agents if needed.
   */
  public static getInstance(): AgentLogger {
    if (!AgentLogger.instance) {
      AgentLogger.instance = new AgentLogger()
    }
    return AgentLogger.instance
  }

  logStart(agentName: string, action: string, metadata?: Record<string, unknown>): string {
    const executionId = Math.random().toString(36).substring(2, 11).toUpperCase()
    
    const entry: AgentLogEntry = {
      id: executionId,
      agentName,
      action,
      startedAt: new Date(),
      completedAt: null,
      duration: null,
      status: "IN_PROGRESS",
      confidence: null,
      metadata: metadata || null,
    }

    this.logs.push(entry)

    console.log(
      `[AgentLogger] [START] [${agentName}:${action}] [ID: ${executionId}]` +
        (metadata ? ` Metadata: ${JSON.stringify(metadata)}` : "")
    )

    return executionId
  }

  logSuccess(executionId: string, confidence?: number, metadata?: Record<string, unknown>): void {
    const entry = this.logs.find((log) => log.id === executionId)
    if (!entry) {
      console.warn(`[AgentLogger] Attempted to log success for unknown execution ID: ${executionId}`)
      return
    }

    const now = new Date()
    entry.completedAt = now
    entry.duration = now.getTime() - entry.startedAt.getTime()
    entry.status = "SUCCESS"
    entry.confidence = confidence !== undefined ? confidence : null
    
    if (metadata) {
      entry.metadata = { ...entry.metadata, ...metadata }
    }

    console.log(
      `[AgentLogger] [SUCCESS] [${entry.agentName}:${entry.action}] [ID: ${executionId}] ` +
        `Duration: ${entry.duration}ms` +
        (entry.confidence !== null ? ` | Confidence: ${entry.confidence}` : "") +
        (entry.metadata ? ` | Metadata: ${JSON.stringify(entry.metadata)}` : "")
    )
  }

  logFailure(executionId: string, error: Error | string, metadata?: Record<string, unknown>): void {
    const entry = this.logs.find((log) => log.id === executionId)
    if (!entry) {
      console.warn(`[AgentLogger] Attempted to log failure for unknown execution ID: ${executionId}`)
      return
    }

    const now = new Date()
    entry.completedAt = now
    entry.duration = now.getTime() - entry.startedAt.getTime()
    entry.status = "FAILURE"
    
    const errorMessage = error instanceof Error ? error.message : error
    const errorStack = error instanceof Error ? error.stack : undefined

    entry.metadata = {
      ...entry.metadata,
      error: errorMessage,
      stack: errorStack,
      ...metadata,
    }

    console.error(
      `[AgentLogger] [FAILURE] [${entry.agentName}:${entry.action}] [ID: ${executionId}] ` +
        `Duration: ${entry.duration}ms | Error: ${errorMessage}` +
        (entry.metadata ? ` | Metadata: ${JSON.stringify(entry.metadata)}` : "")
    )
  }

  getLogs(agentName?: string, executionId?: string): AgentLogEntry[] {
    return this.logs.filter((log) => {
      if (agentName && log.agentName !== agentName) return false
      if (executionId && log.id !== executionId) return false
      return true
    })
  }
}
