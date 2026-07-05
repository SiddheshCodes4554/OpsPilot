"use client"

import React, { useState } from "react"

interface ExecutionLog {
  agentName: string
  level: "INFO" | "WARN" | "ERROR" | "DEBUG"
  message: string
  timestamp: string
}

interface AgentResult {
  agentName: string
  status: "SUCCESS" | "FAILURE" | "IN_PROGRESS"
  output: Record<string, unknown>
  errors?: string[]
  logs: ExecutionLog[]
}

const PAYLOAD_TEMPLATES: Record<string, string> = {
  CustomerAgent: JSON.stringify(
    {
      subject: "Urgent: Broken screen upon delivery",
      body: "Hi team,\n\nI just opened order #49102 but the screen of my new Dell UltraSharp monitor is completely cracked. I need an exchange or refund as soon as possible.\n\nThanks,\nAlice Smith",
    },
    null,
    2
  ),
  InventoryAgent: JSON.stringify(
    {
      sku: "SONYWH1000XM5",
      quantity: 15,
    },
    null,
    2
  ),
  ProcurementAgent: JSON.stringify(
    {
      sku: "SONYWH1000XM5",
      quantity: 20,
    },
    null,
    2
  ),
  SupplierAgent: JSON.stringify(
    {
      subject: "RE: Purchase Order Request - SKU: SONYWH1000XM5",
      body: "Dear Procurement Team,\n\nWe confirm receipt of PO-6E753DFF. We will ship 20 units of SONYWH1000XM5 today. Estimated delivery date is 2026-07-10. Enclosed is our wholesale invoice reference INV-88091 for the total of $6999.80.\n\nBest regards,\nFiona Gallagher",
    },
    null,
    2
  ),
  AnalyticsAgent: JSON.stringify(
    {},
    null,
    2
  ),
  ManagerAgent: JSON.stringify(
    {
      type: "REPLENISHMENT_WORKFLOW",
      sku: "SONYWH1000XM5",
      quantity: 15,
    },
    null,
    2
  ),
}

export default function TestPage() {
  const [selectedAgent, setSelectedAgent] = useState("CustomerAgent")
  const [payloadText, setPayloadText] = useState(PAYLOAD_TEMPLATES.CustomerAgent)
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<AgentResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [duration, setDuration] = useState<number | null>(null)

  const handleRun = async () => {
    setIsRunning(true)
    setResult(null)
    setErrorMsg("")
    setDuration(null)

    try {
      let taskInput = {}
      try {
        taskInput = JSON.parse(payloadText)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        throw new Error(`Invalid JSON syntax in input textarea: ${msg}`)
      }

      const res = await fetch("/api/test-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: selectedAgent, taskInput }),
      })

      const data = await res.json()
      if (data.status === "error" || res.status >= 400) {
        throw new Error(data.message || "Failed to execute agent.")
      }

      setResult(data.result)
      setDuration(data.durationMs)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMsg(msg)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-6 flex flex-col font-sans">
      <header className="mb-6 flex flex-col gap-1 border-b border-zinc-900 pb-4">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          OpsPilot AI | Agent Execution Lab
        </h1>
        <p className="text-xs text-zinc-400">
          Internal testing panel to invoke modular agents directly using Groq, Prisma, and the Prompt Management System.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Side Controls */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4 flex flex-col gap-3">
            <div>
              <label htmlFor="agent-select" className="block text-xs font-semibold text-zinc-400 mb-1">
                Select Agent
              </label>
              <select
                id="agent-select"
                value={selectedAgent}
                onChange={(e) => {
                  const agent = e.target.value
                  setSelectedAgent(agent)
                  setPayloadText(PAYLOAD_TEMPLATES[agent] || "{}")
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="CustomerAgent">Customer Agent (AI email parse)</option>
                <option value="InventoryAgent">Inventory Agent (Deterministic db check)</option>
                <option value="ProcurementAgent">Procurement Agent (Deterministic PO + Groq email)</option>
                <option value="SupplierAgent">Supplier Agent (AI reply parse)</option>
                <option value="AnalyticsAgent">Analytics Agent (AI snapshot generator)</option>
                <option value="ManagerAgent">Manager Agent (Orchestration workflow)</option>
              </select>
            </div>

            <div>
              <label htmlFor="input-payload" className="block text-xs font-semibold text-zinc-400 mb-1">
                Input Payload (JSON)
              </label>
              <textarea
                id="input-payload"
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                rows={10}
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-3 text-xs font-mono focus:outline-none focus:border-blue-500 resize-y"
              />
            </div>

            <button
              onClick={handleRun}
              disabled={isRunning}
              className={`w-full py-2.5 px-4 rounded text-sm font-semibold transition-all duration-200 ${
                isRunning
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md active:scale-[0.98]"
              }`}
            >
              {isRunning ? "Running agent execution..." : "Run Agent Execution"}
            </button>
          </div>

          {errorMsg && (
            <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4 text-xs text-red-400 flex flex-col gap-1">
              <span className="font-semibold text-red-300">Execution Error</span>
              <p className="font-mono whitespace-pre-wrap">{errorMsg}</p>
            </div>
          )}

          {duration !== null && (
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-lg p-4 flex justify-between items-center text-xs">
              <span className="text-zinc-400">Total Execution Time:</span>
              <span className="font-mono text-emerald-400 font-bold">{duration} ms</span>
            </div>
          )}
        </div>

        {/* Right Side Outputs */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Status and logs */}
          <div className="bg-zinc-900/50 rounded-lg border border-zinc-800 p-4 flex-1 flex flex-col gap-3 min-h-[400px]">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h2 className="text-sm font-bold text-zinc-200">Execution Diagnostics</h2>
              {result && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    result.status === "SUCCESS"
                      ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50"
                      : "bg-red-950/40 text-red-400 border border-red-900/50"
                  }`}
                >
                  {result.status}
                </span>
              )}
            </div>

            {/* JSON Output Viewer */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase text-zinc-500">Output JSON Result</span>
                <div className="bg-zinc-950 rounded border border-zinc-800 p-3 max-h-[300px] overflow-y-auto">
                  {result ? (
                    <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap">
                      {JSON.stringify(result.output || {}, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-xs text-zinc-600 italic">No output produced yet. Click Run.</span>
                  )}
                </div>
              </div>

              {/* Logs */}
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-[10px] font-semibold uppercase text-zinc-500">Logger Step Traces</span>
                <div className="bg-zinc-950 rounded border border-zinc-800 p-3 font-mono text-[10px] text-zinc-400 overflow-y-auto flex-1 min-h-[150px] flex flex-col gap-1.5">
                  {result && result.logs && result.logs.length > 0 ? (
                    result.logs.map((log: ExecutionLog, index: number) => {
                      const timeStr = new Date(log.timestamp).toLocaleTimeString()
                      return (
                        <div key={index} className="flex gap-2 border-b border-zinc-900/50 pb-1 last:border-0">
                          <span className="text-zinc-600">[{timeStr}]</span>
                          <span className="text-blue-500 font-semibold">[{log.agentName}]</span>
                          <span
                            className={
                              log.level === "ERROR"
                                ? "text-red-400"
                                : log.level === "WARN"
                                ? "text-amber-400"
                                : "text-zinc-300"
                            }
                          >
                            {log.message}
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <span className="text-xs text-zinc-600 italic">No execution logs available.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
