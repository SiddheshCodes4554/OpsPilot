import "dotenv/config"
import { ManagerAgent } from "../lib/agents/manager/ManagerAgent"
import { prisma } from "../lib/prisma"

async function testAgents() {
  const manager = new ManagerAgent()
  const sessionId = `session-${Date.now()}`
  const context = { sessionId, userId: "test-user-id" }

  console.log("=========================================")
  console.log("🚀 Testing Multi-Agent Architecture")
  console.log(`Session ID: ${sessionId}`)
  console.log("=========================================\n")

  // --- Task 1: Customer Inquiry Workflow ---
  console.log("🏁 Triggering Customer Inquiry Workflow...")
  const inquiryTask = {
    id: "task-inquiry-1",
    type: "CUSTOMER_INQUIRY_WORKFLOW",
    description: "Process support email from Diana Prince",
    input: {
      email: "diana@themyscira.org",
      subject: "Tablet charger recommendation",
      body: "Hi support, what charger do you recommend for the iPad Air M1?",
    },
    createdAt: new Date(),
  }

  const inquiryResult = await manager.execute(inquiryTask, context)
  console.log(`\nInquiry Workflow Status: ${inquiryResult.status}`)
  console.log("Output Summary:", JSON.stringify(inquiryResult.output, null, 2))
  console.log("Execution Logs count:", inquiryResult.logs.length)
  console.log("-----------------------------------------\n")

  // --- Task 2: Replenishment Workflow ---
  console.log("🔧 Forcing stock level below threshold for SONYWH1000XM5 to trigger replenishment...")
  const targetProduct = await prisma.product.findUnique({ where: { sku: "SONYWH1000XM5" } })
  if (targetProduct) {
    await prisma.inventory.update({
      where: { productId: targetProduct.id },
      data: { quantity: 2 },
    })
  }

  console.log("🏁 Triggering Replenishment Workflow (SKU: SONYWH1000XM5)...")
  const replenishmentTask = {
    id: "task-replenishment-1",
    type: "REPLENISHMENT_WORKFLOW",
    description: "Check and automatically replenish stock for Sony headphones",
    input: {
      sku: "SONYWH1000XM5",
      quantity: 15,
    },
    createdAt: new Date(),
  }

  const replenishmentResult = await manager.execute(replenishmentTask, context)
  console.log(`\nReplenishment Workflow Status: ${replenishmentResult.status}`)
  console.log("Output Summary:", JSON.stringify(replenishmentResult.output, null, 2))
  console.log("Execution Logs count:", replenishmentResult.logs.length)
  
  if (replenishmentResult.errors && replenishmentResult.errors.length > 0) {
    console.log("Errors:", replenishmentResult.errors)
  }

  console.log("\n=========================================")
  console.log("📋 Consolidated Execution Logs:")
  console.log("=========================================")
  replenishmentResult.logs.forEach((log) => {
    console.log(`[${log.timestamp.toLocaleTimeString()}] [${log.agentName}] [${log.level}] ${log.message}`)
  })
}

testAgents()
  .catch((e) => {
    console.error("Test execution failed:", e)
  })
