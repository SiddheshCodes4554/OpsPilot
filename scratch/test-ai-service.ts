import "dotenv/config"
import { GroqService } from "../lib/ai/GroqService"
import { z } from "zod"

async function testAiService() {
  console.log("=========================================")
  console.log("🚀 Testing Reusable Groq AI Service")
  console.log("=========================================\n")

  // Check if API key is configured
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes("placeholder")) {
    console.error("❌ GROQ_API_KEY is not configured in .env. Skipping actual API calls.")
    console.log("Checking initialization...")
    try {
      GroqService.getInstance()
      console.log("✅ Initialization check passed (client initialized successfully).")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("❌ Initialization failed:", message)
    }
    return
  }

  const groqService = GroqService.getInstance()

  // Test 1: Simple Chat Completion
  console.log("🏁 Test 1: Simple Chat Completion...")
  const messages = [
    { role: "system" as const, content: "You are a helpful assistant. Keep your answer under 5 words." },
    { role: "user" as const, content: "What is the capital of France?" },
  ]
  const response = await groqService.chatCompletion(messages)
  console.log(`Response: "${response.trim()}"\n`)

  // Test 2: Structured Output with Zod
  console.log("🏁 Test 2: Structured Output with Zod...")
  const structureSchema = z.object({
    capital: z.string(),
    populationMillions: z.number(),
    landmarks: z.array(z.string()),
  })
  
  const structureMessages = [
    { role: "system" as const, content: "You must return a JSON object about France. It must contain the exact keys: 'capital' (string), 'populationMillions' (number, e.g. 68.3), and 'landmarks' (array of strings)." },
    { role: "user" as const, content: "Provide France capital, population, and 2 landmarks in JSON." },
  ]

  const structuredResponse = await groqService.chatStructured(structureMessages, structureSchema)
  console.log("Structured Response:")
  console.log(JSON.stringify(structuredResponse, null, 2))
  console.log()

  // Test 3: Streaming Completion
  console.log("🏁 Test 3: Streaming Chat Completion...")
  const streamMessages = [
    { role: "system" as const, content: "You are an AI assistant. Answer in one short sentence." },
    { role: "user" as const, content: "Why is the sky blue?" },
  ]
  
  process.stdout.write("Stream response: ")
  await groqService.chatStream(
    streamMessages,
    (chunk) => {
      process.stdout.write(chunk)
    }
  )
  console.log("\n\n=========================================")
  console.log("✅ All GroqService tests completed successfully!")
  console.log("=========================================")
}

testAiService().catch((e) => {
  console.error("❌ Test failed with error:", e)
})
