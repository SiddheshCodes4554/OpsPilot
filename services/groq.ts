import Groq from "groq-sdk"
import { z } from "zod"

// Zod schema for structured output validation
export const EmailAnalysisSchema = z.object({
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
  confidence: z.number().min(0).max(1),
})

export type EmailAnalysis = z.infer<typeof EmailAnalysisSchema>

let groqInstance: Groq | null = null

function getGroqClient(): Groq {
  if (!groqInstance) {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      throw new Error("❌ Missing GROQ_API_KEY environment variable.")
    }
    groqInstance = new Groq({ apiKey })
  }
  return groqInstance
}

/**
 * Analyzes a customer email using Groq's LLM model and returns validated structured JSON details.
 * Throws a validation error if the response schema is invalid.
 */
export async function analyzeEmail(subject: string, body: string): Promise<EmailAnalysis> {
  const groq = getGroqClient()

  const systemPrompt = `You are a precise AI assistant for an electronics retailer.
Your task is to analyze incoming customer email subject and body lines and output structured JSON.
You must NOT generate any conversational text, explanations, or code block markers.
Your output must strictly match the following JSON schema:
{
  "intent": "ORDER_INQUIRY" | "REFUND_REQUEST" | "WARRANTY_CLAIM" | "SUPPORT_INQUIRY" | "STOCK_CHECK" | "OTHER",
  "priority": "LOW" | "MEDIUM" | "HIGH",
  "product": string | null,
  "quantity": number | null,
  "confidence": number
}

Field details:
- "product": Extract product name or SKU if mentioned (e.g. "iPhone 15", "SONYWH1000XM5"), else null.
- "quantity": Extract requested item count if mentioned, else null.
- "confidence": Float between 0.0 and 1.0 representing your confidence level.`

  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Subject: ${subject}\n\nBody:\n${body}` },
    ],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
    temperature: 0.1,
  })

  const rawJson = completion.choices[0]?.message?.content
  if (!rawJson) {
    throw new Error("Received empty response from Groq API.")
  }

  const parsedJson = JSON.parse(rawJson)
  
  // Validate schema with Zod. Throws ZodError if invalid.
  return EmailAnalysisSchema.parse(parsedJson)
}
