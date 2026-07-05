import { NextResponse } from "next/server"
import { CustomerAgent } from "@/lib/agents/customer/CustomerAgent"

export async function GET() {
  const customerAgent = new CustomerAgent()

  const mockEmailTask = {
    id: `test-task-${Date.now()}`,
    type: "ANALYZE_EMAIL",
    description: "Manual test verification of AI CustomerAgent analyzer",
    input: {
      subject: "Urgent: Defective battery on order #1903",
      body: "Hi support Team,\n\nI received the Keychron K2 mechanical keyboard yesterday, but the battery seems defective. It won't charge past 10% and dies as soon as I unplug it. Can I exchange this? Thanks, Bruce Wayne.",
    },
    createdAt: new Date(),
  }

  const context = {
    sessionId: `test-session-${Date.now()}`,
    userId: "test-admin-id",
  }

  try {
    console.log("[TestRoute] Triggering AI CustomerAgent analysis...")
    const result = await customerAgent.execute(mockEmailTask, context)
    return NextResponse.json({
      status: "success",
      taskExecuted: mockEmailTask.type,
      agentResult: result,
    })
  } catch (error) {
    console.error("[TestRoute] Execution failed:", error)
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
