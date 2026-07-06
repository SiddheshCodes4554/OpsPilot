import { z } from "zod"
import { PromptMetadata, PromptExample } from "./types"

export const VERSION = "1.2.0"

export const METADATA: PromptMetadata = {
  name: "customer-email-classifier",
  description: "Analyzes incoming support emails to extract customer name, intent, priority, products, quantities, urgency, and confidence levels.",
  tags: ["customer", "classifier", "email"],
}

export const OUTPUT_SCHEMA = z.object({
  customerName: z.string().nullable(),
  intent: z.enum([
    "ORDER",
    "PRODUCT_INQUIRY",
    "WARRANTY",
    "RETURN",
    "REFUND",
    "COMPLAINT",
    "SUPPLIER",
    "SHIPPING",
    "GENERAL",
    "UNKNOWN"
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
  product: z.string().nullable(),
  quantity: z.number().nullable(),
  urgency: z.enum(["LOW", "MEDIUM", "HIGH"]),
  confidence: z.number().min(0).max(1),
})

export type CustomerOutput = z.infer<typeof OUTPUT_SCHEMA>

export interface CustomerInput {
  subject: string
  body: string
}

export const SYSTEM_PROMPT = `You are a precise AI assistant for an electronics retailer.
Your task is to analyze incoming customer email subject and body lines and output structured JSON.
You must NOT generate any conversational text, explanations, or code block markers.
Your output must strictly match the output JSON schema.

Field details:
- "customerName": Extract the sender's name if signed or mentioned, else null.
- "intent": Categorize the customer's request into exactly one of these intents:
  * ORDER: Placing a new order for products.
  * PRODUCT_INQUIRY: Inquiring about product specifications, technical details, or pricing.
  * WARRANTY: Warranty service claims, repairs, or replacements for devices under warranty.
  * RETURN: Asking to return a product.
  * REFUND: Requesting a financial refund.
  * COMPLAINT: Expressing dissatisfaction or complaining about a service, product, or experience.
  * SUPPLIER: Wholesaler/Supplier relations or wholesale shipments.
  * SHIPPING: Inquiring about tracking numbers, shipment ETA, delivery addresses.
  * GENERAL: General conversation, greetings, comments.
  * UNKNOWN: Spam, illegible, or unrecognized intents.
- "priority": Classification (LOW, MEDIUM, HIGH).
- "product": Extract product name or SKU if mentioned, else null. IMPORTANT: If multiple products are mentioned, extract only the FIRST product name/SKU as a single string. Do NOT output arrays.
- "quantity": Extract requested item count if mentioned, else null. IMPORTANT: If multiple quantities are mentioned, extract only the quantity for the first product as a single number. Do NOT output arrays.
- "urgency": Extracted level of urgency (LOW, MEDIUM, HIGH) based on email tone, language, and deadlines.
- "confidence": Float between 0.0 and 1.0 representing your classification confidence.`

export const USER_PROMPT_TEMPLATE = (input: CustomerInput): string => {
  return `Subject: ${input.subject}\n\nBody:\n${input.body}`
}

export const EXAMPLES: PromptExample<CustomerInput, CustomerOutput>[] = [
  {
    input: {
      subject: "Tablet charger recommendation",
      body: "Hi support, what charger do you recommend for the iPad Air M1?\n\nBest, John",
    },
    output: {
      customerName: "John",
      intent: "PRODUCT_INQUIRY",
      priority: "LOW",
      product: "iPad Air M1",
      quantity: null,
      urgency: "LOW",
      confidence: 0.95,
    },
  },
  {
    input: {
      subject: "Urgent: Received broken TV screen",
      body: "Hello, I just opened the box for my order #4801 but the screen of my new Dell UltraSharp is cracked. I need a refund today!\n\nThanks,\nAlice",
    },
    output: {
      customerName: "Alice",
      intent: "REFUND",
      priority: "HIGH",
      product: "Dell UltraSharp",
      quantity: 1,
      urgency: "HIGH",
      confidence: 0.98,
    },
  },
]
