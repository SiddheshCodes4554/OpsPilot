"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import {
  Plus,
  X,
  Send,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Mail,
  User,
  AtSign,
  FileText,
  Zap,
  Bot,
  ShoppingCart,
  Package,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
  ArrowUpRight,
  Info,
  CheckCheck,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkflowLog {
  agentName: string
  level: "INFO" | "WARN" | "ERROR" | "DEBUG"
  message: string
  timestamp: Date | string
}

type SimStatus = "idle" | "processing" | "done" | "error"

interface SimResult {
  workflow: string
  intent: string
  reply: string | null
  subject: string | null
  recipient: string | null
  template: string | null
  orderId?: string
  logs: WorkflowLog[]
  durationMs: number
}

interface SimEmail {
  id: string
  from: string
  subject: string
  message: string
  sentAt: Date
  status: SimStatus
  result: SimResult | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INTENT_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ORDER:           { label: "Order",           icon: ShoppingCart,   color: "#10B981" },
  PRODUCT_INQUIRY: { label: "Product Inquiry",  icon: Package,        color: "#3B82F6" },
  WARRANTY:        { label: "Warranty",         icon: AlertTriangle,  color: "#F59E0B" },
  REFUND:          { label: "Refund",           icon: RefreshCw,      color: "#EF4444" },
  RETURN:          { label: "Return",           icon: ArrowUpRight,   color: "#8B5CF6" },
  COMPLAINT:       { label: "Complaint",        icon: MessageSquare,  color: "#EC4899" },
  SUPPLIER:        { label: "Supplier",         icon: ArrowUpRight,   color: "#6366F1" },
  SHIPPING:        { label: "Shipping",         icon: ArrowUpRight,   color: "#14B8A6" },
  GENERAL:         { label: "General",          icon: MessageSquare,  color: "#71717a" },
  UNKNOWN:         { label: "Unknown",          icon: Info,           color: "#52525b" },
}

const WORKFLOW_LABELS: Record<string, string> = {
  ORDER_PLACED:            "Order Placed",
  REPLENISHMENT_TRIGGERED: "Replenishment Triggered",
  ORDER_PRODUCT_NOT_FOUND: "Product Not Found",
  PRODUCT_INQUIRY_RESPONDED: "Inquiry Answered",
  WARRANTY_RESPONDED:      "Warranty Addressed",
  REFUND_APPROVAL_RAISED:  "Refund → Approval",
  RETURN_RESPONDED:        "Return Processed",
  COMPLAINT_RESPONDED:     "Complaint Resolved",
  SUPPLIER_REPLY_PROCESSED:"Supplier Reply Logged",
  GENERAL_RESPONDED:       "General Reply Sent",
  ESCALATED_TO_OWNER:      "Escalated to Owner",
}

const EXAMPLE_EMAILS = [
  { from: "john.doe@example.com",   subject: "Order Request",          message: "Hi, I'd like to order 3 units of Product A (SKU: PROD-001) please." },
  { from: "jane.smith@example.com", subject: "Warranty Claim",         message: "My device stopped working after 2 months. Can I claim warranty?" },
  { from: "mike@acme.com",          subject: "Product Specifications",  message: "Could you send me the technical specs for your latest industrial sensors?" },
  { from: "lisa@corp.com",          subject: "Refund Request",         message: "I received the wrong item and need a full refund for order #ORD-12345." },
  { from: "supplier@logistics.com", subject: "PO Confirmation",        message: "We confirm receipt of your Purchase Order. Delivery expected in 5–7 days." },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d
  return dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

function levelColor(level: string): string {
  if (level === "ERROR") return "#EF4444"
  if (level === "WARN")  return "#F59E0B"
  if (level === "DEBUG") return "#6366F1"
  return "#10B981"
}

// ---------------------------------------------------------------------------
// Compose Modal
// ---------------------------------------------------------------------------

interface ComposeModalProps {
  onClose: () => void
  onSend: (from: string, subject: string, message: string) => void
  isSending: boolean
}

function ComposeModal({ onClose, onSend, isSending }: ComposeModalProps) {
  const [from, setFrom]       = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  const loadExample = (ex: typeof EXAMPLE_EMAILS[0]) => {
    setFrom(ex.from)
    setSubject(ex.subject)
    setMessage(ex.message)
  }

  const canSend = from.trim() && subject.trim() && message.trim() && !isSending

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        backgroundColor: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
    >
      <div style={{
        width: "100%", maxWidth: "600px",
        backgroundColor: "#111113",
        border: "1px solid #27272a",
        borderRadius: "12px",
        boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid #27272a",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#f4f4f5" }}>
                Simulate Incoming Email
              </p>
              <p style={{ margin: 0, fontSize: "11px", color: "#52525b" }}>
                Processed by ManagerAgent in real-time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#52525b", padding: "4px" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick examples */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #18181b" }}>
          <p style={{ fontSize: "10px", color: "#3f3f46", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 8px 0" }}>
            Quick Examples
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {EXAMPLE_EMAILS.map((ex, i) => (
              <button
                key={i}
                onClick={() => loadExample(ex)}
                style={{
                  padding: "4px 10px", borderRadius: "6px",
                  border: "1px solid #27272a", backgroundColor: "#18181b",
                  fontSize: "11px", color: "#a1a1aa", cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#3B82F6"
                  ;(e.currentTarget as HTMLButtonElement).style.color = "#3B82F6"
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#27272a"
                  ;(e.currentTarget as HTMLButtonElement).style.color = "#a1a1aa"
                }}
              >
                {ex.subject}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* From */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
              From (Sender Email)
            </label>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              backgroundColor: "#18181b", border: "1px solid #27272a",
              borderRadius: "8px", padding: "0 12px", height: "40px",
            }}>
              <AtSign size={13} color="#52525b" />
              <input
                type="email"
                placeholder="customer@example.com"
                value={from}
                onChange={e => setFrom(e.target.value)}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  fontSize: "13px", color: "#d4d4d8",
                }}
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
              Subject
            </label>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              backgroundColor: "#18181b", border: "1px solid #27272a",
              borderRadius: "8px", padding: "0 12px", height: "40px",
            }}>
              <FileText size={13} color="#52525b" />
              <input
                type="text"
                placeholder="Email subject line…"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  fontSize: "13px", color: "#d4d4d8",
                }}
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.4px", display: "block", marginBottom: "6px" }}>
              Message
            </label>
            <textarea
              placeholder="Write the email body here…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              style={{
                width: "100%", backgroundColor: "#18181b",
                border: "1px solid #27272a", borderRadius: "8px",
                padding: "12px", fontSize: "13px", color: "#d4d4d8",
                resize: "vertical", outline: "none", boxSizing: "border-box",
                fontFamily: "inherit", lineHeight: "1.5",
              }}
            />
          </div>

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "4px" }}>
            <p style={{ fontSize: "11px", color: "#3f3f46", margin: 0 }}>
              Processed by ManagerAgent · Results appear instantly
            </p>
            <button
              onClick={() => canSend && onSend(from.trim(), subject.trim(), message.trim())}
              disabled={!canSend}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "0 20px", height: "40px", borderRadius: "8px",
                background: canSend
                  ? "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)"
                  : "#27272a",
                border: "none", cursor: canSend ? "pointer" : "not-allowed",
                fontSize: "13px", fontWeight: 700, color: canSend ? "#fff" : "#52525b",
                transition: "opacity 0.15s",
              }}
            >
              {isSending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
              {isSending ? "Processing…" : "Send to AI"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Email result detail panel
// ---------------------------------------------------------------------------

interface ResultPanelProps {
  email: SimEmail
  onApproveAndSend: (email: SimEmail) => void
  isSending: boolean
}

function ResultPanel({ email, onApproveAndSend, isSending }: ResultPanelProps) {
  const r = email.result
  const intentMeta = r ? (INTENT_META[r.intent] ?? INTENT_META.UNKNOWN) : null
  const IntentIcon = intentMeta?.icon ?? Bot

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      overflow: "hidden", backgroundColor: "#0d0d0f",
    }}>
      {/* Header */}
      <div style={{ padding: "20px", borderBottom: "1px solid #18181b", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
            backgroundColor: "#18181b", border: "1px solid #27272a",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <User size={18} color="#52525b" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: "0 0 2px 0", fontSize: "14px", fontWeight: 700, color: "#f4f4f5" }}>
              {email.subject}
            </p>
            <p style={{ margin: 0, fontSize: "12px", color: "#52525b" }}>
              {email.from} · {formatRelative(email.sentAt)}
            </p>
          </div>
          {/* Status pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "4px 10px", borderRadius: "20px",
            backgroundColor: email.status === "done"       ? "#10B98120"
                           : email.status === "processing" ? "#3B82F620"
                           : email.status === "error"      ? "#EF444420"
                           : "#27272a",
            border: `1px solid ${email.status === "done"       ? "#10B98140"
                                : email.status === "processing" ? "#3B82F640"
                                : email.status === "error"      ? "#EF444440"
                                : "#27272a"}`,
          }}>
            {email.status === "done"       && <CheckCircle2 size={12} color="#10B981" />}
            {email.status === "processing" && <Loader2 size={12} color="#3B82F6" style={{ animation: "spin 1s linear infinite" }} />}
            {email.status === "error"      && <XCircle size={12} color="#EF4444" />}
            {email.status === "idle"       && <Clock size={12} color="#71717a" />}
            <span style={{
              fontSize: "11px", fontWeight: 700,
              color: email.status === "done"       ? "#10B981"
                   : email.status === "processing" ? "#3B82F6"
                   : email.status === "error"      ? "#EF4444"
                   : "#71717a",
            }}>
              {email.status === "done" ? "Completed" : email.status === "processing" ? "Processing…" : email.status === "error" ? "Failed" : "Queued"}
            </span>
          </div>
        </div>

        {/* Original message */}
        <div style={{
          marginTop: "14px", padding: "12px", borderRadius: "8px",
          backgroundColor: "#18181b", border: "1px solid #27272a",
        }}>
          <p style={{ fontSize: "11px", color: "#52525b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 6px 0" }}>
            Original Message
          </p>
          <p style={{ fontSize: "13px", color: "#a1a1aa", margin: 0, lineHeight: "20px", whiteSpace: "pre-wrap" }}>
            {email.message}
          </p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Processing state */}
        {email.status === "processing" && (
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "16px", borderRadius: "10px",
            backgroundColor: "#18181b", border: "1px solid #3B82F630",
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "8px",
              background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Loader2 size={18} color="#fff" style={{ animation: "spin 1s linear infinite" }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#f4f4f5" }}>
                ManagerAgent is running…
              </p>
              <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#52525b" }}>
                Classifying intent · Routing workflow · Dispatching agents
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {r && (
          <>
            {/* Intent + Workflow row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{
                padding: "14px", borderRadius: "10px",
                backgroundColor: "#18181b", border: "1px solid #27272a",
              }}>
                <p style={{ fontSize: "10px", color: "#52525b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 8px 0" }}>
                  Intent
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "6px",
                    backgroundColor: (intentMeta?.color ?? "#52525b") + "20",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <IntentIcon size={14} color={intentMeta?.color ?? "#52525b"} />
                  </div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#f4f4f5" }}>
                    {intentMeta?.label ?? r.intent}
                  </span>
                </div>
              </div>

              <div style={{
                padding: "14px", borderRadius: "10px",
                backgroundColor: "#18181b", border: "1px solid #27272a",
              }}>
                <p style={{ fontSize: "10px", color: "#52525b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 8px 0" }}>
                  Workflow
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "6px",
                    backgroundColor: "#10B98120",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Zap size={14} color="#10B981" />
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#10B981" }}>
                    {WORKFLOW_LABELS[r.workflow] ?? r.workflow}
                  </span>
                </div>
              </div>
            </div>

            {/* Duration */}
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 12px", borderRadius: "6px",
              backgroundColor: "#18181b", border: "1px solid #27272a",
            }}>
              <Clock size={12} color="#52525b" />
              <span style={{ fontSize: "11px", color: "#71717a" }}>
                Completed in <strong style={{ color: "#a1a1aa" }}>{(r.durationMs / 1000).toFixed(2)}s</strong>
              </span>
              {r.orderId && (
                <>
                  <span style={{ color: "#27272a", margin: "0 4px" }}>·</span>
                  <span style={{ fontSize: "11px", color: "#71717a" }}>
                    Order ID: <strong style={{ color: "#a1a1aa", fontFamily: "monospace" }}>{r.orderId.substring(0, 12).toUpperCase()}</strong>
                  </span>
                </>
              )}
            </div>

            {/* Workflow timeline */}
            {r.logs.length > 0 && (
              <div>
                <p style={{ fontSize: "10px", color: "#52525b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 10px 0" }}>
                  Workflow Timeline
                </p>
                <div style={{
                  backgroundColor: "#0a0a0b", borderRadius: "8px",
                  border: "1px solid #18181b", overflow: "hidden",
                }}>
                  {r.logs.map((log, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: "10px",
                        padding: "8px 12px",
                        borderBottom: i < r.logs.length - 1 ? "1px solid #18181b" : "none",
                      }}
                    >
                      {/* Agent dot */}
                      <div style={{
                        width: "6px", height: "6px", borderRadius: "50%",
                        backgroundColor: levelColor(log.level),
                        marginTop: "5px", flexShrink: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                          <span style={{ fontSize: "10px", fontWeight: 700, color: "#52525b", fontFamily: "monospace" }}>
                            {log.agentName}
                          </span>
                          <span style={{
                            fontSize: "9px", fontWeight: 700,
                            padding: "1px 4px", borderRadius: "3px",
                            backgroundColor: levelColor(log.level) + "20",
                            color: levelColor(log.level),
                            textTransform: "uppercase", letterSpacing: "0.3px",
                          }}>
                            {log.level}
                          </span>
                          <span style={{ fontSize: "10px", color: "#3f3f46", marginLeft: "auto" }}>
                            {formatTime(log.timestamp)}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: "12px", color: "#71717a", lineHeight: "18px" }}>
                          {log.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Draft reply */}
            {r.reply && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <p style={{ fontSize: "10px", color: "#52525b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", margin: 0 }}>
                    AI Draft Reply
                  </p>
                  {r.template && (
                    <span style={{
                      fontSize: "10px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px",
                      backgroundColor: "#8B5CF620", color: "#8B5CF6",
                      border: "1px solid #8B5CF640",
                    }}>
                      {r.template.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <div style={{
                  backgroundColor: "#18181b", borderRadius: "8px",
                  border: "1px solid #27272a", padding: "14px",
                }}>
                  {r.subject && (
                    <p style={{ fontSize: "11px", color: "#52525b", margin: "0 0 8px 0", fontWeight: 600 }}>
                      Subject: <span style={{ color: "#a1a1aa", fontWeight: 400 }}>{r.subject}</span>
                    </p>
                  )}
                  <p style={{ fontSize: "13px", color: "#d4d4d8", margin: 0, lineHeight: "22px", whiteSpace: "pre-wrap" }}>
                    {r.reply}
                  </p>
                </div>

                {/* Approve & Send */}
                <button
                  onClick={() => onApproveAndSend(email)}
                  disabled={isSending}
                  style={{
                    marginTop: "12px",
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "0 20px", height: "42px", borderRadius: "8px",
                    background: isSending ? "#27272a" : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                    border: "none", cursor: isSending ? "not-allowed" : "pointer",
                    fontSize: "13px", fontWeight: 700,
                    color: isSending ? "#52525b" : "#fff",
                    width: "100%", justifyContent: "center",
                    transition: "opacity 0.15s",
                  }}
                >
                  {isSending
                    ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Sending…</>
                    : <><CheckCheck size={14} /> Approve & Send</>
                  }
                </button>
              </div>
            )}

            {/* No reply case (escalated / supplier processed) */}
            {!r.reply && (
              <div style={{
                padding: "16px", borderRadius: "10px",
                backgroundColor: "#18181b", border: "1px solid #27272a",
                display: "flex", alignItems: "center", gap: "10px",
              }}>
                <CheckCircle2 size={18} color="#10B981" />
                <p style={{ margin: 0, fontSize: "13px", color: "#a1a1aa" }}>
                  Workflow completed. {r.workflow === "ESCALATED_TO_OWNER"
                    ? "Email escalated to owner for review."
                    : "No customer reply required for this workflow."}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: "16px", padding: "48px",
    }}>
      <div style={{
        width: "64px", height: "64px", borderRadius: "16px",
        background: "linear-gradient(135deg, #3B82F620 0%, #8B5CF620 100%)",
        border: "1px solid #3B82F630",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Sparkles size={28} color="#3B82F6" />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "16px", fontWeight: 700, color: "#f4f4f5", margin: "0 0 6px 0" }}>
          AI Operations Workspace
        </p>
        <p style={{ fontSize: "13px", color: "#52525b", margin: 0, maxWidth: "320px", lineHeight: "20px" }}>
          Simulate incoming emails and watch ManagerAgent classify intent, route workflows, and generate replies in real time.
        </p>
      </div>
      <button
        onClick={onNew}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "0 20px", height: "40px", borderRadius: "8px",
          background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
          border: "none", cursor: "pointer",
          fontSize: "13px", fontWeight: 700, color: "#fff",
        }}
      >
        <Plus size={14} />
        Simulate Incoming Email
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main InboxClient
// ---------------------------------------------------------------------------

export function InboxClient() {
  const [emails, setEmails]           = useState<SimEmail[]>([])
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [isSending, setIsSending]     = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  const selectedEmail = emails.find(e => e.id === selectedId) ?? null

  const handleSendToAI = useCallback(async (from: string, subject: string, message: string) => {
    setIsSending(true)
    const id = `sim-${Date.now()}`
    const newEmail: SimEmail = {
      id, from, subject, message,
      sentAt: new Date(),
      status: "processing",
      result: null,
    }

    setEmails(prev => [newEmail, ...prev])
    setSelectedId(id)
    setShowCompose(false)
    setIsSending(false)

    const startMs = Date.now()

    try {
      const res = await fetch("/api/manager/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: from, subject, body: message }),
      })

      const data = await res.json()
      const durationMs = Date.now() - startMs

      if (!res.ok || data.status === "error") {
        setEmails(prev => prev.map(e => e.id === id ? {
          ...e, status: "error",
          result: {
            workflow: "ERROR",
            intent: "UNKNOWN",
            reply: data.message ?? "An error occurred during processing.",
            subject: null,
            recipient: null,
            template: null,
            logs: data.logs ?? [],
            durationMs,
          },
        } : e))
        return
      }

      setEmails(prev => prev.map(e => e.id === id ? {
        ...e, status: "done",
        result: {
          workflow:  data.workflow  ?? "UNKNOWN",
          intent:    data.intent    ?? "UNKNOWN",
          reply:     data.reply     ?? null,
          subject:   data.subject   ?? null,
          recipient: data.recipient ?? null,
          template:  data.template  ?? null,
          orderId:   data.orderId,
          logs:      (data.logs as WorkflowLog[]) ?? [],
          durationMs,
        },
      } : e))
    } catch (err) {
      setEmails(prev => prev.map(e => e.id === id ? {
        ...e, status: "error",
        result: {
          workflow: "ERROR", intent: "UNKNOWN",
          reply: err instanceof Error ? err.message : "Network error",
          subject: null, recipient: null, template: null,
          logs: [], durationMs: Date.now() - startMs,
        },
      } : e))
    }
  }, [])

  const handleApproveAndSend = useCallback(async (email: SimEmail) => {
    if (!email.result?.reply || !email.result.recipient) return
    setIsApproving(true)
    try {
      await fetch("/api/email/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: email.result.recipient,
          subject:   email.result.subject ?? `Re: ${email.subject}`,
          body:      email.result.reply,
          type:      email.result.template ?? "CUSTOMER_REPLY",
        }),
      })
    } catch (err) {
      console.error("Approve & Send failed:", err)
    } finally {
      setIsApproving(false)
    }
  }, [])

  return (
    <div style={{
      display: "flex", height: "100%",
      backgroundColor: "#09090b", color: "#f4f4f5",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      overflow: "hidden",
    }}>

      {/* ── Left column: email list ─────────────────────────────────── */}
      <div style={{
        width: "320px", flexShrink: 0,
        display: "flex", flexDirection: "column",
        borderRight: "1px solid #18181b",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px", borderBottom: "1px solid #18181b", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Bot size={16} color="#3B82F6" />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#f4f4f5" }}>
              AI Inbox
            </span>
            {emails.length > 0 && (
              <span style={{
                fontSize: "10px", fontWeight: 700, padding: "1px 6px",
                borderRadius: "10px", backgroundColor: "#3B82F620",
                color: "#3B82F6",
              }}>
                {emails.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowCompose(true)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "0 12px", height: "32px", borderRadius: "6px",
              background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
              border: "none", cursor: "pointer",
              fontSize: "12px", fontWeight: 700, color: "#fff",
            }}
          >
            <Plus size={12} />
            New Email
          </button>
        </div>

        {/* Email list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {emails.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <p style={{ fontSize: "12px", color: "#3f3f46", margin: 0 }}>
                No simulated emails yet
              </p>
            </div>
          ) : (
            emails.map(email => {
              const isSelected = selectedId === email.id
              return (
                <div
                  key={email.id}
                  onClick={() => setSelectedId(email.id)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #18181b",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#18181b" : "transparent",
                    borderLeft: `3px solid ${isSelected ? "#3B82F6" : "transparent"}`,
                    transition: "background-color 0.1s",
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#131315" }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#d4d4d8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "180px" }}>
                      {email.from}
                    </span>
                    <div style={{ flexShrink: 0, marginLeft: "6px" }}>
                      {email.status === "done"       && <CheckCircle2 size={13} color="#10B981" />}
                      {email.status === "processing" && <Loader2 size={13} color="#3B82F6" style={{ animation: "spin 1s linear infinite" }} />}
                      {email.status === "error"      && <XCircle size={13} color="#EF4444" />}
                      {email.status === "idle"       && <Clock size={13} color="#52525b" />}
                    </div>
                  </div>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "#a1a1aa", margin: "0 0 2px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {email.subject}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "11px", color: "#3f3f46", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                      {email.message}
                    </span>
                    <span style={{ fontSize: "10px", color: "#3f3f46", flexShrink: 0, marginLeft: "4px" }}>
                      {formatRelative(email.sentAt)}
                    </span>
                  </div>
                  {email.result && (
                    <div style={{
                      marginTop: "6px", display: "flex", alignItems: "center", gap: "5px",
                    }}>
                      {(() => {
                        const im = INTENT_META[email.result.intent] ?? INTENT_META.UNKNOWN
                        const Icon = im.icon
                        return (
                          <>
                            <Icon size={10} color={im.color} />
                            <span style={{ fontSize: "10px", fontWeight: 600, color: im.color }}>
                              {im.label}
                            </span>
                          </>
                        )
                      })()}
                      <span style={{ fontSize: "10px", color: "#3f3f46" }}>·</span>
                      <span style={{ fontSize: "10px", color: "#3f3f46" }}>
                        {(email.result.durationMs / 1000).toFixed(1)}s
                      </span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right: detail panel ─────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {selectedEmail ? (
          <ResultPanel
            email={selectedEmail}
            onApproveAndSend={handleApproveAndSend}
            isSending={isApproving}
          />
        ) : (
          <EmptyState onNew={() => setShowCompose(true)} />
        )}
      </div>

      {/* ── Compose modal ──────────────────────────────────────────── */}
      {showCompose && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSend={handleSendToAI}
          isSending={isSending}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        *::-webkit-scrollbar { width: 4px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
      `}</style>
    </div>
  )
}
