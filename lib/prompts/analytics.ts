import { z } from "zod"
import { PromptMetadata, PromptExample } from "./types"

export const VERSION = "1.0.0"

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
