import { z } from "zod"
import { PromptMetadata, PromptExample } from "./types"

export const VERSION = "1.0.0"

export const METADATA: PromptMetadata = {
  name: "procurement-po-recommender",
  description: "Analyzes stock levels and determines replenishment requirements and quantities.",
  tags: ["procurement", "po", "replenishment"],
}

export const OUTPUT_SCHEMA = z.object({
  shouldProcure: z.boolean(),
  recommendedQuantity: z.number(),
  estimatedCost: z.number(),
  priority: z.enum(["URGENT", "ROUTINE", "NONE"]),
  rationale: z.string(),
})

export type ProcurementOutput = z.infer<typeof OUTPUT_SCHEMA>

export interface ProcurementInput {
  sku: string
  onHand: number
  available: number
  threshold: number
  unitPrice: number
}

export const SYSTEM_PROMPT = `You are a precise AI assistant for an electronics retailer.
Your task is to analyze product inventory metrics and recommend whether to generate a Purchase Order (PO) and output structured JSON.
You must NOT generate any conversational text, explanations, or code block markers.
Your output must strictly match the output JSON schema.

Field details:
- "shouldProcure": Set to true if "available" stock is less than or equal to the "threshold".
- "recommendedQuantity": If "shouldProcure" is true, recommend a quantity sufficient to restock back to twice the threshold, or a standard restock batch (e.g. 10, 20, 50). If false, set to 0.
- "estimatedCost": Calculated as recommendedQuantity multiplied by unitPrice.
- "priority":
  * URGENT: Available stock is 0 or negative.
  * ROUTINE: Available stock is above 0 but below/at threshold.
  * NONE: Stock is healthy.
- "rationale": Short explanation detailing the calculation (e.g. "Available stock of 3 is below the threshold of 10. Recommending restock of 15 units.").`

export const USER_PROMPT_TEMPLATE = (input: ProcurementInput): string => {
  return `Product: ${input.sku}\nOn-Hand Qty: ${input.onHand}\nAvailable (On-Hand - Reserved): ${input.available}\nReorder Threshold: ${input.threshold}\nUnit Price: $${input.unitPrice}`
}

export const EXAMPLES: PromptExample<ProcurementInput, ProcurementOutput>[] = [
  {
    input: {
      sku: "SONYWH1000XM5",
      onHand: 5,
      available: 3,
      threshold: 10,
      unitPrice: 349.99,
    },
    output: {
      shouldProcure: true,
      recommendedQuantity: 15,
      estimatedCost: 5249.85,
      priority: "ROUTINE",
      rationale: "Available stock of 3 units is below the threshold of 10. Recommending restock of 15 units to secure inventory.",
    },
  },
  {
    input: {
      sku: "IPHONE15PRO",
      onHand: 1,
      available: -2, // More reserved than on-hand!
      threshold: 5,
      unitPrice: 1199.99,
    },
    output: {
      shouldProcure: true,
      recommendedQuantity: 20,
      estimatedCost: 23999.8,
      priority: "URGENT",
      rationale: "Available stock is in deficit (-2) due to active pending orders. Restock of 20 units is urgent to fulfill existing backorders.",
    },
  },
]
