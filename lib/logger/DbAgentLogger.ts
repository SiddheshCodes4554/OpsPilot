import { prisma } from "@/lib/prisma"
import { LogLevel } from "@prisma/client"
import { AgentLogEntry, IAgentLogger } from "./types"

export class DbAgentLogger implements IAgentLogger {
  private static instance: DbAgentLogger | null = null
  private logs: AgentLogEntry[] = []

  public static getInstance(): DbAgentLogger {
    if (!DbAgentLogger.instance) {
      DbAgentLogger.instance = new DbAgentLogger()
    }
    return DbAgentLogger.instance
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

    console.log(`[DbAgentLogger] [START] [${agentName}:${action}] [ID: ${executionId}]`)

    // Write to PostgreSQL database asynchronously
    prisma.agentLog
      .create({
        data: {
          action: `${agentName}:${action}`,
          level: LogLevel.INFO,
          message: `Initiated execution [ID: ${executionId}]`,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      })
      .catch((err) => {
        console.error("[DbAgentLogger] Failed to write start log to DB:", err)
      })

    return executionId
  }

  logSuccess(executionId: string, confidence?: number, metadata?: Record<string, unknown>): void {
    const entry = this.logs.find((log) => log.id === executionId)
    if (!entry) return

    const now = new Date()
    entry.completedAt = now
    entry.duration = now.getTime() - entry.startedAt.getTime()
    entry.status = "SUCCESS"
    entry.confidence = confidence !== undefined ? confidence : null
    if (metadata) {
      entry.metadata = { ...entry.metadata, ...metadata }
    }

    console.log(`[DbAgentLogger] [SUCCESS] [${entry.agentName}:${entry.action}] [ID: ${executionId}]`)

    prisma.agentLog
      .create({
        data: {
          action: `${entry.agentName}:${entry.action}`,
          level: LogLevel.INFO,
          message: `Successfully completed execution [ID: ${executionId}]. Duration: ${entry.duration}ms. Confidence: ${entry.confidence}`,
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        },
      })
      .catch((err) => {
        console.error("[DbAgentLogger] Failed to write success log to DB:", err)
      })
  }

  logFailure(executionId: string, error: Error | string, metadata?: Record<string, unknown>): void {
    const entry = this.logs.find((log) => log.id === executionId)
    if (!entry) return

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

    console.error(`[DbAgentLogger] [FAILURE] [${entry.agentName}:${entry.action}] [ID: ${executionId}]`)

    prisma.agentLog
      .create({
        data: {
          action: `${entry.agentName}:${entry.action}`,
          level: LogLevel.ERROR,
          message: `Failed execution [ID: ${executionId}]. Error: ${errorMessage}`,
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
        },
      })
      .catch((err) => {
        console.error("[DbAgentLogger] Failed to write failure log to DB:", err)
      })
  }

  getLogs(agentName?: string, executionId?: string): AgentLogEntry[] {
    return this.logs.filter((log) => {
      if (agentName && log.agentName !== agentName) return false
      if (executionId && log.id !== executionId) return false
      return true
    })
  }
}
