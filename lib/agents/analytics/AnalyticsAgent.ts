import { prisma } from "@/lib/prisma"
import { Task, AgentResult, AgentContext, ExecutionLog, IAgent } from "../shared/types"
import { IAgentLogger } from "../../logger/types"
import { AgentLogger } from "../../logger/AgentLogger"
import { GroqService } from "../../ai/GroqService"
import {
  ANALYTICS_SUMMARY_SYSTEM_PROMPT,
  ANALYTICS_SUMMARY_USER_TEMPLATE,
  ANALYTICS_SUMMARY_SCHEMA,
} from "../../prompts/analytics"

export class AnalyticsAgent implements IAgent {
  private agentName = "AnalyticsAgent"
  private logger: IAgentLogger
  private groqService: GroqService

  constructor(logger?: IAgentLogger) {
    this.logger = logger ?? AgentLogger.getInstance()
    this.groqService = GroqService.getInstance()
  }

  /**
   * Executes business data analytics summary using Groq and the Prompt Engine.
   * Compiles sales numbers, inventory levels, and procurement pipelines.
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

    log(`Received analytics compilation task (Session: ${context.sessionId})`)

    try {
      // Extract optional pre-calculated counts or pull dynamically from Prisma
      const inputData = task.input as {
        totalOrdersCount?: number
        totalSalesVolume?: number
        averageOrderValue?: number
        totalProductsCount?: number
        lowStockProductsCount?: number
        totalPurchaseOrdersCount?: number
        pendingPurchaseOrdersCount?: number
        riskFactorsText?: string
      }

      let totalOrdersCount = inputData.totalOrdersCount
      let totalSalesVolume = inputData.totalSalesVolume
      let averageOrderValue = inputData.averageOrderValue
      let totalProductsCount = inputData.totalProductsCount
      let lowStockProductsCount = inputData.lowStockProductsCount
      let totalPurchaseOrdersCount = inputData.totalPurchaseOrdersCount
      let pendingPurchaseOrdersCount = inputData.pendingPurchaseOrdersCount
      let riskFactorsText = inputData.riskFactorsText ?? ""

      // Dynamically compile from database if any metric is missing
      if (
        totalOrdersCount === undefined ||
        totalSalesVolume === undefined ||
        lowStockProductsCount === undefined
      ) {
        log(`Compiling live metrics from database tables...`)

        const [
          dbProductCount,
          dbLowStockCount,
          dbOrderCount,
          dbAllOrders,
          dbPoCount,
          dbPendingPoCount,
        ] = await Promise.all([
          prisma.product.count(),
          prisma.inventory.count({
            where: {
              quantity: {
                lte: prisma.inventory.fields.minStockLevel,
              },
            },
          }),
          prisma.order.count(),
          prisma.order.findMany({ select: { totalAmount: true } }),
          prisma.purchaseOrder.count(),
          prisma.purchaseOrder.count({
            where: {
              status: "PENDING",
            },
          }),
        ])

        totalProductsCount = dbProductCount
        lowStockProductsCount = dbLowStockCount
        totalOrdersCount = dbOrderCount
        totalSalesVolume = dbAllOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
        averageOrderValue = totalOrdersCount > 0 ? totalSalesVolume / totalOrdersCount : 0
        totalPurchaseOrdersCount = dbPoCount
        pendingPurchaseOrdersCount = dbPendingPoCount

        // Compile details on risk factors
        const lowStockItems = await prisma.product.findMany({
          where: {
            inventory: {
              quantity: {
                lte: prisma.inventory.fields.minStockLevel,
              },
            },
          },
          select: { name: true, sku: true },
          take: 3,
        })

        const itemNames = lowStockItems.map((item) => `${item.name} (${item.sku})`).join(", ")
        riskFactorsText = `${lowStockProductsCount} items remain below reorder levels (${
          itemNames || "none currently"
        }). ${pendingPurchaseOrdersCount} POs are pending approval.`
      }

      log(`Operational dataset assembled. Preparing prompts for Groq summarization...`)

      const messages = [
        { role: "system" as const, content: ANALYTICS_SUMMARY_SYSTEM_PROMPT },
        {
          role: "user" as const,
          content: ANALYTICS_SUMMARY_USER_TEMPLATE({
            totalOrdersCount,
            totalSalesVolume,
            averageOrderValue: averageOrderValue ?? 0,
            totalProductsCount: totalProductsCount ?? 0,
            lowStockProductsCount: lowStockProductsCount ?? 0,
            totalPurchaseOrdersCount: totalPurchaseOrdersCount ?? 0,
            pendingPurchaseOrdersCount: pendingPurchaseOrdersCount ?? 0,
            riskFactorsText,
          }),
        },
      ]

      log(`Invoking Groq service for structured snapshot generation...`)

      // Execute AI generation and Zod schema parsing
      const summary = await this.groqService.chatStructured(
        messages,
        ANALYTICS_SUMMARY_SCHEMA,
        { temperature: 0.2 }
      )

      log(`Operational summary compiled successfully. Risk Rating: "${summary.riskLevel}"`)

      const result: AgentResult = {
        agentName: this.agentName,
        status: "SUCCESS",
        output: summary as unknown as Record<string, unknown>,
        logs,
      }

      this.logger.logSuccess(executionId, summary.confidence, result.output)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log(`Analytics compilation failed: ${message}`, "ERROR")
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
