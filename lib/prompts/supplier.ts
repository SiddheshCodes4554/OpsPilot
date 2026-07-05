import { z } from "zod"
import { PromptMetadata, PromptExample } from "./types"

export const VERSION = "1.0.0"

export const METADATA: PromptMetadata = {
  name: "supplier-catalog-extractor",
  description: "Extracts supplier catalog items, SKU codes, price points, and lead times from raw text files.",
  tags: ["supplier", "catalog", "extractor"],
}

export const OUTPUT_SCHEMA = z.object({
  supplierName: z.string(),
  items: z.array(
    z.object({
      sku: z.string(),
      name: z.string(),
      price: z.number(),
      leadTimeDays: z.number(),
    })
  ),
})

export type SupplierOutput = z.infer<typeof OUTPUT_SCHEMA>

export interface SupplierInput {
  catalogText: string
}

export const SYSTEM_PROMPT = `You are a precise AI assistant for an electronics retailer.
Your task is to parse raw supplier catalog quotations and output structured JSON.
You must NOT generate any conversational text, explanations, or code block markers.
Your output must strictly match the output JSON schema.

Field details:
- "supplierName": Extract the supplier or vendor company name.
- "items": List of extracted product items:
  * sku: Product unique code or catalog identifier.
  * name: Full descriptive product name.
  * price: Float representing wholesale unit price.
  * leadTimeDays: Integer representing the number of days required for dispatch and delivery.`

export const USER_PROMPT_TEMPLATE = (input: SupplierInput): string => {
  return `Catalog Quotation Raw Text:\n\n${input.catalogText}`
}

export const EXAMPLES: PromptExample<SupplierInput, SupplierOutput>[] = [
  {
    input: {
      catalogText: "Apex Distribution Price Sheet\nMacBook Pro M3 Max - SKU: APX-MBP3M - Unit Price: $1650.00 - Delivers in 4 days.",
    },
    output: {
      supplierName: "Apex Distribution",
      items: [
        {
          sku: "APX-MBP3M",
          name: "MacBook Pro M3 Max",
          price: 1650.0,
          leadTimeDays: 4,
        },
      ],
    },
  },
]
