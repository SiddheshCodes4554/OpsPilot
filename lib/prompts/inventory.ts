import { z } from "zod"
import { PromptMetadata, PromptExample } from "./types"

export const VERSION = "1.0.0"

export const METADATA: PromptMetadata = {
  name: "inventory-query-parser",
  description: "Parses staff stock queries, restock alerts, and quantity adjustments.",
  tags: ["inventory", "parser", "stock"],
}

export const OUTPUT_SCHEMA = z.object({
  sku: z.string().nullable(),
  action: z.enum(["CHECK", "ADJUST", "ALERT", "UNKNOWN"]),
  adjustmentQuantity: z.number().nullable(),
  reason: z.string().nullable(),
})

export type InventoryOutput = z.infer<typeof OUTPUT_SCHEMA>

export interface InventoryInput {
  query: string
}

export const SYSTEM_PROMPT = `You are a precise AI assistant for an electronics retailer.
Your task is to analyze staff stock queries and output structured JSON.
You must NOT generate any conversational text, explanations, or code block markers.
Your output must strictly match the output JSON schema.

Field details:
- "sku": Extract the product SKU mentioned (e.g. SONYWH1000XM5, IPHONE15PRO), else null.
- "action":
  * CHECK: Simple query of stock level, e.g. "how many do we have".
  * ADJUST: Staff manual inventory adjustments, e.g. "increment stock by 5", "deduct 2 units".
  * ALERT: Highlighting critical alarms or restock warnings.
  * UNKNOWN: Query is unrelated or ambiguous.
- "adjustmentQuantity": The amount to adjust by (positive for increment, negative for decrement), else null.
- "reason": Brief description of why this query/adjustment was requested, else null.`

export const USER_PROMPT_TEMPLATE = (input: InventoryInput): string => {
  return `Query: ${input.query}`
}

export const EXAMPLES: PromptExample<InventoryInput, InventoryOutput>[] = [
  {
    input: {
      query: "How many Sony WH-1000XM5 headphones do we have left in Aisle A-4?",
    },
    output: {
      sku: "SONYWH1000XM5",
      action: "CHECK",
      adjustmentQuantity: null,
      reason: "Staff check of Sony WH-1000XM5 stock level.",
    },
  },
  {
    input: {
      query: "Remove 3 units of Dell monitor SKU DELLU2723QE due to floor sample display usage.",
    },
    output: {
      sku: "DELLU2723QE",
      action: "ADJUST",
      adjustmentQuantity: -3,
      reason: "Floor sample display usage adjustment.",
    },
  },
]
