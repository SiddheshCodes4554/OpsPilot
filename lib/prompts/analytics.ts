import { z } from "zod"
import { PromptMetadata, PromptExample } from "./types"

export const VERSION = "1.1.0"

export const METADATA: PromptMetadata = {
  name: "analytics-audit-summarizer",
  description: "Analyzes business snapshots and flagged orders to compile risk ratings and actionable summaries.",
  tags: ["analytics", "summarizer", "audit"],
}

export const OUTPUT_SCHEMA = z.object({
  summary: z.string(),
  averageValueAnalysis: z.string(),
  riskScore: z.number().min(0).max(10),
  keyRecommendations: z.array(z.string()),
})

export type AnalyticsOutput = z.infer<typeof OUTPUT_SCHEMA>

export interface AnalyticsInput {
  auditedCount: number
  totalSales: number
  avgOrderValue: number
  flaggedOrdersCount: number
  detailsText: string
}

export const SYSTEM_PROMPT = `You are a precise AI assistant for an electronics retailer.
Your task is to analyze order audit metrics and compile a structured summary and output JSON.
You must NOT generate any conversational text, explanations, or code block markers.
Your output must strictly match the output JSON schema.

Field details:
- "summary": A brief, executive operational summary of the audit state.
- "averageValueAnalysis": Commentary on the computed average order value relative to retail standards.
- "riskScore": Integer between 0 and 10 representing risk levels (e.g. high volume of flagged or backordered items increases risk).
- "keyRecommendations": Array of actionable steps for operations staff.`

export const USER_PROMPT_TEMPLATE = (input: AnalyticsInput): string => {
  return `Audited Orders Count: ${input.auditedCount}\nTotal Sales Vol: $${input.totalSales}\nAverage Order Value: $${input.avgOrderValue}\nFlagged High-Value Orders Count: ${input.flaggedOrdersCount}\nAudit Details: ${input.detailsText}`
}

export const EXAMPLES: PromptExample<AnalyticsInput, AnalyticsOutput>[] = [
  {
    input: {
      auditedCount: 15,
      totalSales: 15450.0,
      avgOrderValue: 1030.0,
      flaggedOrdersCount: 4,
      detailsText: "4 orders are above $1000 threshold. 2 pending orders have inventory shortfalls.",
    },
    output: {
      summary: "Audit completed for 15 sales orders. Total volume reaches $15,450.00 with 4 orders flagged above threshold.",
      averageValueAnalysis: "Average order value of $1,030.00 is high, reflecting premium hardware purchases (laptops and phones).",
      riskScore: 4,
      keyRecommendations: [
        "Resolve stock shortfalls for the 2 flagged pending orders immediately.",
        "Perform manual review on the 4 high-value orders before shipping.",
      ],
    },
  },
]

// ==========================================
// BUSINESS SNAPSHOT ANALYTICS PROMPTS
// ==========================================

export const ANALYTICS_SUMMARY_SCHEMA = z.object({
  businessSummary: z.string(),
  inventoryHealth: z.string(),
  recommendations: z.array(z.string()),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  confidence: z.number().min(0).max(1),
})

export type AnalyticsSummaryOutput = z.infer<typeof ANALYTICS_SUMMARY_SCHEMA>

export interface AnalyticsSummaryInput {
  totalOrdersCount: number
  totalSalesVolume: number
  averageOrderValue: number
  totalProductsCount: number
  lowStockProductsCount: number
  totalPurchaseOrdersCount: number
  pendingPurchaseOrdersCount: number
  riskFactorsText: string
}

export const ANALYTICS_SUMMARY_SYSTEM_PROMPT = `You are a precise AI operations analyst for an electronics retailer.
Your task is to analyze order volume, sales figures, inventory alerts, and purchase orders, and output structured JSON summarizing business health.
You must NOT generate any conversational text, explanations, or code block markers.
Your output must strictly match the output JSON schema.

Field details:
- "businessSummary": A professional executive summary of the sales performance, volume, and financial transaction highlights represented as a single flat string. Do NOT write this as a nested JSON object.
- "inventoryHealth": A detailed breakdown of the inventory health, commenting on the alert levels (number of low-stock items) and reorder efficacy, represented as a single flat string. Do NOT write this as a nested JSON object.
- "recommendations": Array of 3-5 specific, actionable steps for logistics, warehouse managers, or buying teams.
- "riskLevel": Set to "HIGH" if low stock count is > 5 or there are > 3 pending POs with stock deficits, "MEDIUM" if there are minor stock shortfalls, else "LOW".
- "confidence": Float between 0.0 and 1.0 representing your analysis confidence.`

export const ANALYTICS_SUMMARY_USER_TEMPLATE = (input: AnalyticsSummaryInput): string => {
  return `Sales Performance:
- Total Orders: ${input.totalOrdersCount}
- Total Sales Volume: $${input.totalSalesVolume.toFixed(2)}
- Average Order Value: $${input.averageOrderValue.toFixed(2)}

Inventory & Supply Chain Status:
- Total Catalog Products: ${input.totalProductsCount}
- Low Stock Alert Items: ${input.lowStockProductsCount}
- Total Purchase Orders: ${input.totalPurchaseOrdersCount}
- Pending Purchase Orders: ${input.pendingPurchaseOrdersCount}

Risk Factors / Details:
${input.riskFactorsText}`
}

export const ANALYTICS_SUMMARY_EXAMPLES: PromptExample<AnalyticsSummaryInput, AnalyticsSummaryOutput>[] = [
  {
    input: {
      totalOrdersCount: 24,
      totalSalesVolume: 28940.5,
      averageOrderValue: 1205.85,
      totalProductsCount: 15,
      lowStockProductsCount: 3,
      totalPurchaseOrdersCount: 8,
      pendingPurchaseOrdersCount: 2,
      riskFactorsText: "3 items remain below threshold (Sony Headphones, Dell Monitor, Apple iPads). 2 POs are awaiting manager approval.",
    },
    output: {
      businessSummary: "Excellent sales performance with $28,940.50 in volume across 24 orders. Average order value is strong at $1,205.85, driven by high-end laptops and mobile phones.",
      inventoryHealth: "Moderate concern regarding inventory. 3 items have low stock alerts. Stock replenishment is underway with 2 pending purchase orders.",
      recommendations: [
        "Approve the 2 pending purchase orders immediately to release wholesale shipments.",
        "Perform a stock replenishment count for Apple iPads to verify physical on-hand levels.",
        "Launch a promotional campaign for overstocked mouse catalog items.",
      ],
      riskLevel: "MEDIUM",
      confidence: 0.98,
    },
  },
]
