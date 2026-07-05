import dotenv from "dotenv"
import { analyzeEmail } from "../services/groq"

// Load env vars
dotenv.config()

async function test() {
  const subject = "Cracked screen on Dell UltraSharp monitor"
  const body = "Hi Support,\n\nI received my Dell UltraSharp 27\" monitor today, but upon opening the box I noticed the screen is cracked in the bottom-left corner. I would like a replacement sent out immediately.\n\nThanks,\nAlice"

  console.log("📨 Sending email to Groq for analysis...")
  console.log(`Subject: ${subject}`)

  try {
    const analysis = await analyzeEmail(subject, body)
    console.log("\n✅ Success! Groq returned validated JSON analysis:")
    console.log(JSON.stringify(analysis, null, 2))
  } catch (error) {
    console.error("\n❌ Error running analysis:", error)
  }
}

test()
