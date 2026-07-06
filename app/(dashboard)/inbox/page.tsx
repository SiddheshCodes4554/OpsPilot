import React from "react"
import { InboxClient } from "@/components/inbox/InboxClient"

export const metadata = {
  title: "AI Inbox — OpsPilot AI",
  description: "Simulate incoming emails and watch ManagerAgent classify intent, route workflows, and generate replies in real time.",
}

export default function InboxPage() {
  return (
    <div style={{ height: "calc(100vh - 57px)", overflow: "hidden" }}>
      <InboxClient />
    </div>
  )
}
