import { CustomerAgent } from "../lib/agents/customer/CustomerAgent"
import { InventoryAgent } from "../lib/agents/inventory/InventoryAgent"
import { ProcurementAgent } from "../lib/agents/procurement/ProcurementAgent"
import { SupplierAgent } from "../lib/agents/supplier/SupplierAgent"
import { AnalyticsAgent } from "../lib/agents/analytics/AnalyticsAgent"
import { ManagerAgent } from "../lib/agents/manager/ManagerAgent"

const customerAgent = new CustomerAgent()
const inventoryAgent = new InventoryAgent()
const procurementAgent = new ProcurementAgent()
const supplierAgent = new SupplierAgent()
const analyticsAgent = new AnalyticsAgent()

const managerAgent = new ManagerAgent(
  customerAgent,
  inventoryAgent,
  procurementAgent,
  supplierAgent,
  analyticsAgent
)

const EXAMPLE_EMAILS = [
  { from: "john.doe@example.com",   subject: "Order Request",          message: "Hi, I'd like to order 3 units of Product A (SKU: PROD-001) please." },
  { from: "jane.smith@example.com", subject: "Warranty Claim",         message: "My device stopped working after 2 months. Can I claim warranty?" },
  { from: "mike@acme.com",          subject: "Product Specifications",  message: "Could you send me the technical specs for your latest industrial sensors?" },
  { from: "lisa@corp.com",          subject: "Refund Request",         message: "I received the wrong item and need a full refund for order #ORD-12345." },
  { from: "supplier@logistics.com", subject: "PO Confirmation",        message: "We confirm receipt of your Purchase Order. Delivery expected in 5–7 days." },
]

async function runTests() {
  for (const ex of EXAMPLE_EMAILS) {
    console.log(`\n========================================\nTesting: ${ex.subject}`);
    const task = {
      id: `test-run-${Date.now()}`,
      type: "CUSTOMER_INQUIRY_WORKFLOW",
      description: "Process support email",
      input: { email: ex.from, subject: ex.subject, body: ex.message },
      createdAt: new Date(),
    }
    const context = { sessionId: `test-session-${Date.now()}`, userId: "test-user" }
    try {
      const result = await managerAgent.execute(task, context)
      console.log("Status:", result.status)
      console.log("Output:", JSON.stringify(result.output, null, 2))
      if (result.errors) {
        console.log("Errors:", result.errors)
      }
    } catch (err: any) {
      console.log("Exception:", err.message)
    }
  }
}

runTests().then(() => console.log("Done."))
