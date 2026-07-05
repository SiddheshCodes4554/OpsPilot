import { z } from "zod"
import { PromptMetadata, PromptExample } from "./types"

export const VERSION = "1.1.0"

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

// ==========================================
// SUPPLIER EMAIL REPLY PARSER PROMPTS
// ==========================================

export const REPLY_PARSER_SCHEMA = z.object({
  deliveryDate: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  priceConfirmed: z.number().nullable(),
  confirmed: z.boolean(),
  confidence: z.number().min(0).max(1),
})

export type ReplyParserOutput = z.infer<typeof REPLY_PARSER_SCHEMA>

export interface ReplyParserInput {
  subject: string
  body: string
}

export const REPLY_PARSER_SYSTEM_PROMPT = `You are a precise AI assistant for an electronics retailer.
Your task is to analyze email replies from suppliers confirming purchase orders and output structured JSON.
You must NOT generate any conversational text, explanations, or code block markers.
Your output must strictly match the output JSON schema.

Field details:
- "deliveryDate": Extract the estimated delivery date if mentioned (formatted as YYYY-MM-DD), else null.
- "invoiceNumber": Extract the invoice ID or reference number if mentioned, else null.
- "priceConfirmed": Extract the total wholesale cost or unit price confirmed by the supplier (as a float), else null.
- "confirmed": Boolean set to true if the supplier clearly confirms, accepts, or validates the order, else false.
- "confidence": Float between 0.0 and 1.0 representing your analysis confidence.`

export const REPLY_PARSER_USER_TEMPLATE = (input: ReplyParserInput): string => {
  return `Subject: ${input.subject}\n\nBody:\n${input.body}`
}

export const REPLY_PARSER_EXAMPLES: PromptExample<ReplyParserInput, ReplyParserOutput>[] = [
  {
    input: {
      subject: "RE: Purchase Order Request - SKU: SONYWH1000XM5",
      body: "Hi Team,\n\nWe have received your PO. We will dispatch the 20 headphones today. Delivery is estimated for 2026-07-10. Invoice reference is INV-88091 for the agreed total of $6999.80.\n\nBest, Elena",
    },
    output: {
      deliveryDate: "2026-07-10",
      invoiceNumber: "INV-88091",
      priceConfirmed: 6999.8,
      confirmed: true,
      confidence: 0.99,
    },
  },
  {
    input: {
      subject: "Out of Office: Purchase Order Request",
      body: "Thank you for your message. I am out of office until next Monday with no email access.",
    },
    output: {
      deliveryDate: null,
      invoiceNumber: null,
      priceConfirmed: null,
      confirmed: false,
      confidence: 0.95,
    },
  },
]
