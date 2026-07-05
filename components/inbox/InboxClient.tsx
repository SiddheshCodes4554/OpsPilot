"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import {
  Search,
  Sparkles,
  Clock,
  FileText
} from "lucide-react"

export interface EmailWithCustomer {
  id: string
  subject: string
  body: string
  status: string
  priority: string
  sender: string
  recipient: string
  createdAt: Date | string
  customer?: {
    name: string
    company?: string | null
    phone?: string | null
    email: string
  } | null
}

interface InboxClientProps {
  initialEmails: EmailWithCustomer[]
}

interface WorkflowLog {
  agentName: string
  level: "INFO" | "WARN" | "ERROR" | "DEBUG"
  message: string
  timestamp: string
}

interface AgentState {
  status: "IDLE" | "PROCESSING" | "SUCCESS" | "FAILED"
}

interface ProcessState {
  aiStatus: "UNPROCESSED" | "PROCESSING" | "PROCESSED" | "FAILURE"
  durationMs: number | null
  confidence: number | null
  intent: string | null
  product: string | null
  quantity: number | null
  suggestedAction: string | null
  logs: WorkflowLog[]
  agents: Record<string, AgentState>
  output: Record<string, unknown> | null
  approvalNeeded: {
    id: string
    comments: string | null
    type: "REFUND" | "PROCUREMENT"
  } | null
}

// Pure helper function declared outside to bypass react-hooks/purity check
function getNow(): number {
  return typeof window !== "undefined" ? window.performance.now() : Date.now()
}

export function InboxClient({ initialEmails }: InboxClientProps) {
  const [emails] = useState<EmailWithCustomer[]>(initialEmails)
  const [selectedId, setSelectedId] = useState<string | null>(
    initialEmails.length > 0 ? initialEmails[0].id : null
  )

  const [searchQuery, setSearchQuery] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  // State maps to track executions per email
  const [processStates, setProcessStates] = useState<Record<string, ProcessState>>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("opspilot_inbox_states")
        return cached ? JSON.parse(cached) : {}
      } catch (e) {
        console.error("Failed to load cached process states:", e)
      }
    }
    return {}
  })
  const [isRunning, setIsRunning] = useState(false)
  const [resolvingApproval, setResolvingApproval] = useState(false)

  const selectedEmail = emails.find((e) => e.id === selectedId)

  // Sync process states to localStorage
  const saveProcessStates = (
    updater:
      | Record<string, ProcessState>
      | ((prev: Record<string, ProcessState>) => Record<string, ProcessState>)
  ) => {
    setProcessStates((prev) => {
      const nextStates = typeof updater === "function" ? updater(prev) : updater
      try {
        localStorage.setItem("opspilot_inbox_states", JSON.stringify(nextStates))
      } catch (e) {
        console.error("Failed to cache process states:", e)
      }
      return nextStates
    })
  }

  const handleProcessEmail = async (email: EmailWithCustomer) => {
    if (isRunning) return

    setIsRunning(true)

    const initialAgentStates: Record<string, AgentState> = {
      CustomerAgent: { status: "PROCESSING" },
      InventoryAgent: { status: "IDLE" },
      ProcurementAgent: { status: "IDLE" },
      SupplierAgent: { status: "IDLE" },
      ManagerAgent: { status: "PROCESSING" },
    }

    const tStart = getNow()

    saveProcessStates({
      ...processStates,
      [email.id]: {
        aiStatus: "PROCESSING",
        durationMs: null,
        confidence: null,
        intent: null,
        product: null,
        quantity: null,
        suggestedAction: null,
        logs: [],
        agents: initialAgentStates,
        output: null,
        approvalNeeded: null,
      },
    })

    try {
      const res = await fetch("/api/manager/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: email.sender,
          subject: email.subject,
          body: email.body,
        }),
      })

      const data = (await res.json()) as Record<string, unknown>
      const tEnd = getNow()
      const durationMs = Math.round(tEnd - tStart)

      if (data.status === "error" || res.status >= 400) {
        throw new Error((data.message as string) || "Manager routing failed.")
      }

      // Extract details
      const logs: WorkflowLog[] = (data.logs as WorkflowLog[]) || []
      const intent = (data.intent as string) || null
      const product = (data.product as string) || null
      const quantity = (data.quantity as number) || null

      let confidence = 0.95
      const customerSuccessLog = logs.find(
        (log) => log.agentName === "CustomerAgent" && log.message.includes("confidence")
      )
      if (customerSuccessLog) {
        const match = customerSuccessLog.message.match(/confidence:\s*([\d.]+)/i)
        if (match) confidence = parseFloat(match[1])
      }

      // Map suggested actions by intent
      let suggestedAction = "Respond to general inquiry"
      if (intent === "ORDER") suggestedAction = "Validate and place order"
      else if (intent === "PRODUCT_INQUIRY") suggestedAction = "Draft specifications answer"
      else if (intent === "WARRANTY") suggestedAction = "Process warranty policy check"
      else if (intent === "REFUND") suggestedAction = "Request refund approval"
      else if (intent === "RETURN") suggestedAction = "Generate return RMA label"
      else if (intent === "COMPLAINT") suggestedAction = "Draft support reconciliation response"
      else if (intent === "SUPPLIER") suggestedAction = "Analyze supplier wholesale confirmation"

      // Check if approval record was created
      let approvalNeeded: { id: string; comments: string | null; type: "REFUND" | "PROCUREMENT" } | null = null
      if (data.approval) {
        const appRecord = data.approval as { id: string; comments: string | null }
        approvalNeeded = {
          id: appRecord.id,
          comments: appRecord.comments,
          type: intent === "REFUND" ? "REFUND" : "PROCUREMENT",
        }
      }

      // Simulate sequential agent execution animations
      await simulateAgentCompletion(
        email.id,
        logs,
        intent || "UNKNOWN",
        product,
        quantity,
        data,
        durationMs,
        confidence,
        suggestedAction,
        approvalNeeded
      )

    } catch (error) {
      console.error("[ProcessWithAI] Error:", error)
      const tEnd = getNow()
      const msg = error instanceof Error ? error.message : String(error)

      saveProcessStates({
        ...processStates,
        [email.id]: {
          aiStatus: "FAILURE",
          durationMs: Math.round(tEnd - tStart),
          confidence: 0,
          intent: "UNKNOWN",
          product: null,
          quantity: null,
          suggestedAction: "Escalate to administrator review",
          logs: [
            {
              agentName: "ManagerAgent",
              level: "ERROR",
              message: msg,
              timestamp: new Date().toISOString(),
            },
          ],
          agents: {
            CustomerAgent: { status: "FAILED" },
            InventoryAgent: { status: "IDLE" },
            ProcurementAgent: { status: "IDLE" },
            SupplierAgent: { status: "IDLE" },
            ManagerAgent: { status: "FAILED" },
          },
          output: { error: msg },
          approvalNeeded: null,
        },
      })
    } finally {
      setIsRunning(false)
    }
  }

  // Sequentially animate statuses to represent real-time multi-agent activity
  const simulateAgentCompletion = async (
    emailId: string,
    logs: WorkflowLog[],
    intent: string,
    product: string | null,
    quantity: number | null,
    output: Record<string, unknown>,
    durationMs: number,
    confidence: number,
    suggestedAction: string,
    approvalNeeded: { id: string; comments: string | null; type: "REFUND" | "PROCUREMENT" } | null
  ) => {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    // Step 1: CustomerAgent completes
    saveProcessStates((prev) => ({
      ...prev,
      [emailId]: {
        ...prev[emailId],
        logs: logs.filter((l) => l.agentName === "CustomerAgent" || l.agentName === "ManagerAgent"),
        agents: {
          CustomerAgent: { status: "SUCCESS" },
          InventoryAgent: { status: intent === "ORDER" ? "PROCESSING" : "IDLE" },
          ProcurementAgent: { status: "IDLE" },
          SupplierAgent: { status: intent === "SUPPLIER" ? "PROCESSING" : "IDLE" },
          ManagerAgent: { status: "PROCESSING" },
        },
        intent,
        product,
        quantity,
        confidence,
        suggestedAction,
      },
    }))
    await delay(600)

    // Step 2: Inventory check or Supplier reply parse runs
    if (intent === "ORDER") {
      const hasProcurement = !!output.purchaseOrder || !!output.approval
      saveProcessStates((prev) => ({
        ...prev,
        [emailId]: {
          ...prev[emailId],
          logs: logs.filter((l) => ["CustomerAgent", "InventoryAgent", "ManagerAgent"].includes(l.agentName)),
          agents: {
            CustomerAgent: { status: "SUCCESS" },
            InventoryAgent: { status: "SUCCESS" },
            ProcurementAgent: { status: hasProcurement ? "PROCESSING" : "IDLE" },
            SupplierAgent: { status: "IDLE" },
            ManagerAgent: { status: "PROCESSING" },
          },
        },
      }))
      await delay(600)

      if (hasProcurement) {
        saveProcessStates((prev) => ({
          ...prev,
          [emailId]: {
            ...prev[emailId],
            logs,
            agents: {
              CustomerAgent: { status: "SUCCESS" },
              InventoryAgent: { status: "SUCCESS" },
              ProcurementAgent: { status: "SUCCESS" },
              SupplierAgent: { status: "IDLE" },
              ManagerAgent: { status: approvalNeeded ? "PROCESSING" : "SUCCESS" },
            },
            aiStatus: approvalNeeded ? "PROCESSING" : "PROCESSED",
            durationMs,
            output,
            approvalNeeded,
          },
        }))
        return
      }
    } else if (intent === "SUPPLIER") {
      saveProcessStates((prev) => ({
        ...prev,
        [emailId]: {
          ...prev[emailId],
          logs,
          agents: {
            CustomerAgent: { status: "SUCCESS" },
            InventoryAgent: { status: "IDLE" },
            ProcurementAgent: { status: "IDLE" },
            SupplierAgent: { status: "SUCCESS" },
            ManagerAgent: { status: "SUCCESS" },
          },
          aiStatus: "PROCESSED",
          durationMs,
          output,
        },
      }))
      return
    }

    // Step 3: Finish and mark all complete
    saveProcessStates((prev) => ({
      ...prev,
      [emailId]: {
        ...prev[emailId],
        logs,
        agents: {
          CustomerAgent: { status: "SUCCESS" },
          InventoryAgent: { status: intent === "ORDER" ? "SUCCESS" : "IDLE" },
          ProcurementAgent: { status: "IDLE" },
          SupplierAgent: { status: "IDLE" },
          ManagerAgent: { status: "SUCCESS" },
        },
        aiStatus: approvalNeeded ? "PROCESSING" : "PROCESSED",
        durationMs,
        output,
        approvalNeeded,
      },
    }))
  }

  // Handle Approve/Reject action on the approval card
  const handleResolveApproval = async (emailId: string, approvalId: string, action: "APPROVE" | "REJECT") => {
    if (resolvingApproval) return
    setResolvingApproval(true)

    try {
      const res = await fetch("/api/approvals/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId, action }),
      })

      const data = (await res.json()) as Record<string, unknown>
      if (data.status === "error") {
        throw new Error((data.message as string) || "Failed to resolve approval.")
      }

      // Add a resolution log
      const resLog: WorkflowLog = {
        agentName: "ManagerAgent",
        level: "INFO",
        message: `Approval request resolved: ${action}D by manager. workflow closed.`,
        timestamp: new Date().toISOString(),
      }

      const currentState = processStates[emailId]
      saveProcessStates({
        ...processStates,
        [emailId]: {
          ...currentState,
          aiStatus: "PROCESSED",
          approvalNeeded: null,
          logs: [...currentState.logs, resLog],
          agents: {
            ...currentState.agents,
            ManagerAgent: { status: "SUCCESS" },
          },
          output: {
            ...currentState.output,
            approvalResolved: action,
          },
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(msg)
    } finally {
      setResolvingApproval(false)
    }
  }

  // Helper styles
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "text-rose-400 bg-rose-950/20 border-rose-900/30"
      case "MEDIUM":
        return "text-amber-400 bg-amber-950/20 border-amber-900/30"
      default:
        return "text-zinc-400 bg-zinc-900/40 border-zinc-800"
    }
  }

  const getAiStatusStyle = (status: string) => {
    switch (status) {
      case "PROCESSING":
        return "text-blue-400 bg-blue-950/20 border-blue-900/30 animate-pulse"
      case "PROCESSED":
        return "text-emerald-400 bg-emerald-950/20 border-emerald-900/30"
      case "FAILURE":
        return "text-rose-400 bg-rose-950/20 border-rose-900/30"
      default:
        return "text-zinc-505 bg-zinc-950/40 border-zinc-900"
    }
  }

  // Filter emails based on selectors
  const filteredEmails = emails.filter((email) => {
    const query = searchQuery.toLowerCase()
    if (query) {
      const matchSubject = email.subject.toLowerCase().includes(query)
      const matchBody = email.body.toLowerCase().includes(query)
      const matchSender = email.sender.toLowerCase().includes(query)
      if (!matchSubject && !matchBody && !matchSender) return false
    }

    if (priorityFilter && email.priority !== priorityFilter) return false

    if (statusFilter) {
      const emailState = processStates[email.id] || { aiStatus: "UNPROCESSED" }
      if (statusFilter !== emailState.aiStatus) return false
    }

    return true
  })

  const currentState = selectedId
    ? processStates[selectedId] || {
        aiStatus: "UNPROCESSED" as const,
        durationMs: null,
        confidence: null,
        intent: null,
        product: null,
        quantity: null,
        suggestedAction: null,
        logs: [],
        agents: {
          CustomerAgent: { status: "IDLE" as const },
          InventoryAgent: { status: "IDLE" as const },
          ProcurementAgent: { status: "IDLE" as const },
          SupplierAgent: { status: "IDLE" as const },
          ManagerAgent: { status: "IDLE" as const },
        },
        output: null,
        approvalNeeded: null,
      }
    : null

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-170px)] min-h-[650px] text-zinc-50 font-sans">
      {/* ========================================================================= */}
      {/* COLUMN 1: LEFT (30%) - Emails list, search and filters */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-[30%] flex flex-col h-full shrink-0">
        <Card className="flex-1 flex flex-col overflow-hidden bg-zinc-950/60 border-zinc-900 backdrop-blur-md">
          {/* Search bar */}
          <div className="p-3.5 border-b border-zinc-900 space-y-2 bg-zinc-950/40">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search workspace..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md pl-8 pr-3 py-2 text-xs text-zinc-250 placeholder-zinc-550 focus:outline-none focus:border-zinc-700"
              />
            </div>
            {/* Filters selectors */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-400 focus:outline-none cursor-pointer"
              >
                <option value="">All Priorities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-400 focus:outline-none cursor-pointer"
              >
                <option value="">All AI Statuses</option>
                <option value="UNPROCESSED">Unprocessed</option>
                <option value="PROCESSING">Processing</option>
                <option value="PROCESSED">Processed</option>
                <option value="FAILURE">Failure</option>
              </select>
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/60 scrollbar-thin">
            {filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs py-8">
                No communications found.
              </div>
            ) : (
              filteredEmails.map((email) => {
                const isSelected = email.id === selectedId
                const emailState = processStates[email.id] || { aiStatus: "UNPROCESSED" }
                const isUnread = emailState.aiStatus === "UNPROCESSED"
                const dateStr = new Date(email.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })

                return (
                  <button
                    key={email.id}
                    onClick={() => setSelectedId(email.id)}
                    className={`w-full text-left block p-4 transition-all duration-150 hover:bg-zinc-900/30 ${
                      isSelected ? "bg-zinc-900/50 border-r-2 border-blue-500" : "bg-transparent"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {isUnread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                          )}
                          <span className="font-semibold text-xs text-zinc-200 truncate">
                            {email.customer?.name || email.sender}
                          </span>
                        </div>
                        <span className="text-[9px] text-zinc-500 whitespace-nowrap shrink-0">
                          {dateStr}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-400 font-medium truncate">
                        {email.subject}
                      </div>

                      <div className="flex items-center flex-wrap gap-2 pt-0.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold border tracking-wider uppercase ${getPriorityStyle(
                            email.priority
                          )}`}
                        >
                          {email.priority}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold border tracking-wider uppercase ${getAiStatusStyle(
                            emailState.aiStatus
                          )}`}
                        >
                          {emailState.aiStatus.toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* COLUMN 2: CENTER (45%) - Selected email body and AI Analysis details */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-[45%] flex flex-col h-full min-w-0">
        <Card className="flex-1 overflow-y-auto bg-zinc-950/60 border-zinc-900 backdrop-blur-md flex flex-col p-6 gap-6">
          {selectedEmail ? (
            <div className="flex-1 flex flex-col gap-5">
              {/* Header */}
              <div className="space-y-4 pb-5 border-b border-zinc-900/60">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <h2 className="text-base font-bold text-zinc-150 leading-snug tracking-tight">
                    {selectedEmail.subject}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold border tracking-wider uppercase ${getPriorityStyle(
                      selectedEmail.priority
                    )}`}
                  >
                    {selectedEmail.priority}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-2 pt-1 text-zinc-400">
                  <div>
                    <span className="text-zinc-500 font-medium">From:</span>{" "}
                    <span className="font-semibold text-zinc-300">
                      {selectedEmail.customer?.name || "Unknown"}
                    </span>{" "}
                    <code className="text-zinc-500 text-[10px]">&lt;{selectedEmail.sender}&gt;</code>
                  </div>
                  <div className="text-zinc-500 text-[10px] font-medium font-mono whitespace-nowrap">
                    {new Date(selectedEmail.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Email Content Box */}
              <div className="text-xs leading-relaxed text-zinc-300 bg-zinc-900/20 rounded-lg border border-zinc-900 p-4 whitespace-pre-wrap font-sans">
                {selectedEmail.body}
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleProcessEmail(selectedEmail)}
                  disabled={isRunning || currentState?.aiStatus === "PROCESSING"}
                  className={`flex items-center gap-2 py-2 px-4 rounded text-xs font-semibold transition-all duration-200 ${
                    isRunning || currentState?.aiStatus === "PROCESSING"
                      ? "bg-zinc-900 border border-zinc-800 text-zinc-650 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/10 active:scale-[0.98]"
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  Process with AI
                </button>
              </div>

              {/* AI Analysis details block */}
              <div className="border-t border-zinc-900/80 pt-5 space-y-4">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  AI Extraction Summary
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Intent */}
                  <div className="bg-zinc-900/20 border border-zinc-900 rounded-lg p-3 space-y-1.5">
                    <span className="text-[10px] text-zinc-500 font-medium">Classified Intent</span>
                    <div className="font-semibold text-xs text-zinc-200">
                      {currentState?.intent ? (
                        <span className="px-1.5 py-0.5 rounded bg-blue-950/20 border border-blue-900/40 text-blue-400 font-mono text-[10px]">
                          {currentState.intent}
                        </span>
                      ) : (
                        <span className="text-zinc-650 italic">None</span>
                      )}
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="bg-zinc-900/20 border border-zinc-900 rounded-lg p-3 space-y-1.5">
                    <span className="text-[10px] text-zinc-500 font-medium">AI Confidence</span>
                    <div className="font-semibold text-xs text-zinc-200">
                      {currentState && currentState.confidence !== null ? (
                        <span className="font-mono text-indigo-400 font-bold text-xs">
                          {Math.round(currentState.confidence * 100)}%
                        </span>
                      ) : (
                        <span className="text-zinc-650 italic">None</span>
                      )}
                    </div>
                  </div>

                  {/* Matched Product */}
                  <div className="bg-zinc-900/20 border border-zinc-900 rounded-lg p-3 space-y-1.5">
                    <span className="text-[10px] text-zinc-500 font-medium">Extracted Product</span>
                    <div className="font-semibold text-xs text-zinc-200 truncate">
                      {currentState?.product || <span className="text-zinc-650 italic">N/A</span>}
                    </div>
                  </div>

                  {/* Extracted Quantity */}
                  <div className="bg-zinc-900/20 border border-zinc-900 rounded-lg p-3 space-y-1.5">
                    <span className="text-[10px] text-zinc-500 font-medium">Extracted Quantity</span>
                    <div className="font-semibold text-xs text-zinc-200 font-mono">
                      {currentState?.quantity !== null ? currentState?.quantity : <span className="text-zinc-650 italic">N/A</span>}
                    </div>
                  </div>
                </div>

                {/* Suggested Action card */}
                {currentState && currentState.aiStatus !== "UNPROCESSED" && (
                  <div className="bg-zinc-900/10 border border-zinc-900 rounded-lg p-4 space-y-2">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider block">
                      Suggested Action
                    </span>
                    <div className="flex items-start gap-2.5">
                      <div className="p-1 rounded bg-blue-950/20 border border-blue-900/30 text-blue-400 mt-0.5">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-zinc-200">
                          {currentState.suggestedAction}
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-normal">
                          The manager orchestrator routed this inquiry to specialized sub-agents based on email intent.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-zinc-500 text-xs text-center font-sans">
              No email selected.
            </div>
          )}
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* COLUMN 3: RIGHT (25%) - Live Agent Execution, statuses, timeline, approval */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-[25%] flex flex-col h-full shrink-0">
        <Card className="flex-1 overflow-y-auto bg-zinc-950/60 border-zinc-900 backdrop-blur-md flex flex-col p-5 gap-5">
          {currentState && currentState.aiStatus !== "UNPROCESSED" ? (
            <div className="space-y-5 flex-1 flex flex-col h-full">
              {/* Agent Status Indicators */}
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-1 border-b border-zinc-900/60">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Workforce Execution
                  </h3>
                  {currentState.durationMs && (
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      {currentState.durationMs} ms
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  {/* Manager Agent */}
                  <div className="flex justify-between items-center p-2 rounded bg-zinc-900/10 border border-zinc-900/40">
                    <span className="text-zinc-400">Manager Agent</span>
                    <span
                      className={`text-[9px] font-semibold font-mono uppercase px-1.5 py-0.5 rounded border ${
                        currentState.agents.ManagerAgent?.status === "SUCCESS"
                          ? "text-emerald-400 bg-emerald-950/20 border-emerald-900/40"
                          : currentState.agents.ManagerAgent?.status === "PROCESSING"
                          ? "text-blue-400 bg-blue-950/20 border-blue-900/40"
                          : "text-zinc-550 bg-zinc-900 border-zinc-800"
                      }`}
                    >
                      {currentState.agents.ManagerAgent?.status.toLowerCase()}
                    </span>
                  </div>

                  {/* Customer Agent */}
                  <div className="flex justify-between items-center p-2 rounded bg-zinc-900/10 border border-zinc-900/40">
                    <span className="text-zinc-400">Customer Agent</span>
                    <span
                      className={`text-[9px] font-semibold font-mono uppercase px-1.5 py-0.5 rounded border ${
                        currentState.agents.CustomerAgent?.status === "SUCCESS"
                          ? "text-emerald-400 bg-emerald-950/20 border-emerald-900/40"
                          : currentState.agents.CustomerAgent?.status === "PROCESSING"
                          ? "text-blue-400 bg-blue-950/20 border-blue-900/40"
                          : "text-zinc-550 bg-zinc-900 border-zinc-800"
                      }`}
                    >
                      {currentState.agents.CustomerAgent?.status.toLowerCase()}
                    </span>
                  </div>

                  {/* Inventory Agent */}
                  <div className="flex justify-between items-center p-2 rounded bg-zinc-900/10 border border-zinc-900/40">
                    <span className="text-zinc-400">Inventory Agent</span>
                    <span
                      className={`text-[9px] font-semibold font-mono uppercase px-1.5 py-0.5 rounded border ${
                        currentState.agents.InventoryAgent?.status === "SUCCESS"
                          ? "text-emerald-400 bg-emerald-950/20 border-emerald-900/40"
                          : currentState.agents.InventoryAgent?.status === "PROCESSING"
                          ? "text-blue-400 bg-blue-950/20 border-blue-900/40"
                          : "text-zinc-550 bg-zinc-900 border-zinc-800"
                      }`}
                    >
                      {currentState.agents.InventoryAgent?.status.toLowerCase()}
                    </span>
                  </div>

                  {/* Procurement Agent */}
                  <div className="flex justify-between items-center p-2 rounded bg-zinc-900/10 border border-zinc-900/40">
                    <span className="text-zinc-400">Procurement Agent</span>
                    <span
                      className={`text-[9px] font-semibold font-mono uppercase px-1.5 py-0.5 rounded border ${
                        currentState.agents.ProcurementAgent?.status === "SUCCESS"
                          ? "text-emerald-400 bg-emerald-950/20 border-emerald-900/40"
                          : currentState.agents.ProcurementAgent?.status === "PROCESSING"
                          ? "text-blue-400 bg-blue-950/20 border-blue-900/40"
                          : "text-zinc-550 bg-zinc-900 border-zinc-800"
                      }`}
                    >
                      {currentState.agents.ProcurementAgent?.status.toLowerCase()}
                    </span>
                  </div>

                  {/* Supplier Agent */}
                  <div className="flex justify-between items-center p-2 rounded bg-zinc-900/10 border border-zinc-900/40">
                    <span className="text-zinc-400">Supplier Agent</span>
                    <span
                      className={`text-[9px] font-semibold font-mono uppercase px-1.5 py-0.5 rounded border ${
                        currentState.agents.SupplierAgent?.status === "SUCCESS"
                          ? "text-emerald-400 bg-emerald-950/20 border-emerald-900/40"
                          : currentState.agents.SupplierAgent?.status === "PROCESSING"
                          ? "text-blue-400 bg-blue-950/20 border-blue-900/40"
                          : "text-zinc-550 bg-zinc-900 border-zinc-800"
                      }`}
                    >
                      {currentState.agents.SupplierAgent?.status.toLowerCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Approval Card */}
              {selectedId && currentState.approvalNeeded && (
                <div className="p-4 bg-yellow-950/20 border border-yellow-900/50 rounded-lg space-y-3 text-xs animate-slide-in">
                  <div className="flex items-center gap-1.5 text-yellow-400 font-bold uppercase tracking-wider text-[10px]">
                    <Clock className="h-3.5 w-3.5" />
                    Approval Required
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                    {currentState.approvalNeeded.comments || "Refill PO total exceeds $1,000 threshold."}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolveApproval(selectedId, currentState.approvalNeeded!.id, "REJECT")}
                      disabled={resolvingApproval}
                      className="flex-1 py-1.5 rounded text-[11px] font-semibold border border-rose-900/50 bg-rose-950/10 text-rose-400 hover:bg-rose-950/30 transition-all cursor-pointer"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleResolveApproval(selectedId, currentState.approvalNeeded!.id, "APPROVE")}
                      disabled={resolvingApproval}
                      className="flex-1 py-1.5 rounded text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-all cursor-pointer"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              )}

              {/* Workflow timeline */}
              <div className="flex flex-col gap-2 flex-1 min-h-0">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider pb-1 border-b border-zinc-900/60">
                  Execution Timeline
                </h3>
                <div className="flex-1 overflow-y-auto bg-zinc-950 border border-zinc-900/80 p-3 rounded-lg font-mono text-[9px] text-zinc-550 space-y-2.5 max-h-[300px]">
                  {currentState.logs.length === 0 ? (
                    <div className="italic text-zinc-750">Logs stream pending...</div>
                  ) : (
                    currentState.logs.map((log, index) => {
                      const timeStr = new Date(log.timestamp).toLocaleTimeString()
                      return (
                        <div key={index} className="space-y-0.5 border-b border-zinc-900/40 pb-1.5 last:border-0 last:pb-0">
                          <div className="flex justify-between items-center">
                            <span className="text-blue-500 font-semibold">[{log.agentName}]</span>
                            <span className="text-[8px] text-zinc-600">{timeStr}</span>
                          </div>
                          <p
                            className={
                              log.level === "ERROR"
                                ? "text-rose-400 leading-normal"
                                : log.level === "WARN"
                                ? "text-amber-400 leading-normal"
                                : "text-zinc-300 leading-normal"
                            }
                          >
                            {log.message}
                          </p>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs text-center font-sans py-12">
              Process with AI to initiate operational workforce triggers.
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
