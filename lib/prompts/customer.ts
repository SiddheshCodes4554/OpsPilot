import { z } from "zod"
import { PromptMetadata, PromptExample } from "./types"

export const VERSION = "1.1.0"

export const METADATA: PromptMetadata = {
  name: "customer-email-classifier",
  description: "Analyzes incoming support emails to extract customer name, intent, priority, products, quantities, urgency, and confidence levels.",
  tags: ["customer", "classifier", "email"],
}

export const OUTPUT_SCHEMA = z.object({
  customerName: z.string().nullable(),
  intent: z.enum([
    "ORDER_INQUIRY",
    "REFUND_REQUEST",
    "WARRANTY_CLAIM",
    "SUPPORT_INQUIRY",
    "STOCK_CHECK",
    "OTHER",
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
- "intent": Categorize the customer's request:
  * ORDER_INQUIRY: Inquiries about existing orders, tracking, invoices.
  * REFUND_REQUEST: Requests for refunds, returns, cancellations.
  * WARRANTY_CLAIM: Requests for warranty services, repairs, replacements.
  * SUPPORT_INQUIRY: Technical help, specs questions, usage questions.
  * STOCK_CHECK: Asking if products are in stock or about future restock.
  * OTHER: General comments, greetings, spam.
- "priority": Classification:
  * HIGH: Mentions broken devices upon receipt, threats, urgent deadlines.
  * MEDIUM: Standard queries, returns.
  * LOW: General inquiries, greetings.
- "product": Extract product name or SKU if mentioned, else null.
- "quantity": Extract requested item count if mentioned, else null.
- "urgency": Extracted level of urgency based on email tone, language, and deadlines:
  * HIGH: Demands immediate action, expresses frustration, mentions breakage.
  * MEDIUM: Standard service request or product inquiry with standard follow-up.
  * LOW: Informational queries, no immediate action required.
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
      intent: "SUPPORT_INQUIRY",
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
      body: "Hello, I just opened the box for my order #4801 but the screen of my new Dell UltraSharp is cracked. I need a refund or a replacement today!\n\nThanks,\nAlice",
    },
    output: {
      customerName: "Alice",
      intent: "REFUND_REQUEST",
      priority: "HIGH",
      product: "Dell UltraSharp",
      quantity: 1,
      urgency: "HIGH",
      confidence: 0.98,
    },
  },
]
