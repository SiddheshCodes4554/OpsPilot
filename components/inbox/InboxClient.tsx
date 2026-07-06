"use client"

import React, { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import {
  Mail,
  User,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  RefreshCw,
  Search,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types & Formatting
// ---------------------------------------------------------------------------

interface CustomerDetail {
  id: string
  name: string
  email: string
}

interface EmailItem {
  id: string
  subject: string
  body: string
  status: "SENT" | "FAILED" | "RECEIVED" | "DRAFT"
  priority: "LOW" | "MEDIUM" | "HIGH"
  sender: string
  recipient: string
  createdAt: string
  customer?: CustomerDetail | null
}

interface EmailsResponse {
  emails: EmailItem[]
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function InboxClient() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [composeReplyText, setComposeReplyText] = useState("")
  const [sendingId, setSendingId] = useState<string | null>(null)

  const queryClient = useQueryClient()

  // Poll database every 3 seconds for live email sync
  const { data, isLoading } = useQuery<{ emails: EmailItem[] }>({
    queryKey: ["inboxEmails"],
    queryFn: async () => {
      const res = await fetch("/api/emails?limit=100")
      const json = await res.json()
      if (json.status === "error") throw new Error(json.message)
      return json.data
    },
    refetchInterval: 3000,
  })

  // Mutation to send manual reply via POST /api/email/reply
  const sendReplyMutation = useMutation({
    mutationFn: async ({ recipient, subject, body }: { recipient: string; subject: string; body: string }) => {
      const res = await fetch("/api/email/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient,
          subject,
          body,
          type: "CUSTOMER_REPLY",
        }),
      })
      const json = await res.json()
      if (!res.ok || json.status === "error") {
        throw new Error(json.message || "Failed to dispatch email reply")
      }
      return json.data
    },
    onMutate: ({ recipient }) => {
      setSendingId(recipient)
    },
    onSuccess: () => {
      setComposeReplyText("")
      queryClient.invalidateQueries({ queryKey: ["inboxEmails"] })
    },
    onError: (err) => {
      alert(err.message)
    },
    onSettled: () => {
      setSendingId(null)
    },
  })

  const emailsList = data?.emails || []

  // Filter incoming customer emails (RECEIVED)
  const receivedEmails = emailsList.filter(e => e.status === "RECEIVED")

  // Filter sent/failed replies
  const sentReplies = emailsList.filter(e => e.status === "SENT" || e.status === "FAILED")

  // Apply search query filter
  const filteredReceived = receivedEmails.filter(e => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      e.subject.toLowerCase().includes(q) ||
      e.sender.toLowerCase().includes(q) ||
      e.body.toLowerCase().includes(q) ||
      (e.customer?.name && e.customer.name.toLowerCase().includes(q))
    )
  })

  // Auto-select first email if none selected
  const activeEmail = filteredReceived.find(e => e.id === selectedId) || filteredReceived[0]

  // Find matching replies for the active email
  const activeReplies = activeEmail
    ? sentReplies.filter(r => 
        r.recipient.toLowerCase() === activeEmail.sender.toLowerCase() &&
        new Date(r.createdAt) >= new Date(activeEmail.createdAt)
      )
    : []


  const handleSendManualReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeEmail || !composeReplyText.trim()) return

    await sendReplyMutation.mutateAsync({
      recipient: activeEmail.sender,
      subject: activeEmail.subject.startsWith("Re: ") ? activeEmail.subject : `Re: ${activeEmail.subject}`,
      body: composeReplyText.trim(),
    })
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 120px)", color: "#f4f4f5", overflow: "hidden" }}>
      
      {/* ── Left Column: Inbound List ── */}
      <div style={{ width: "340px", borderRight: "1px solid #18181b", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Search header */}
        <div style={{ padding: "16px", borderBottom: "1px solid #18181b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "8px", padding: "0 10px", height: "36px" }}>
            <Search size={13} color="#52525b" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search inbox..."
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#d4d4d8", fontSize: "12px" }}
            />
          </div>
        </div>

        {/* List */}
        <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "#52525b" }} />
            </div>
          ) : filteredReceived.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#52525b", fontStyle: "italic", fontSize: "12px" }}>
              No incoming messages in queue.
            </div>
          ) : (
            filteredReceived.map(email => {
              const hasReplied = sentReplies.some(r => 
                r.recipient.toLowerCase() === email.sender.toLowerCase() &&
                new Date(r.createdAt) >= new Date(email.createdAt)
              )

              const isSelected = activeEmail?.id === email.id

              return (
                <div
                  key={email.id}
                  onClick={() => setSelectedId(email.id)}
                  style={{
                    padding: "14px 16px",
                    borderLeft: `3px solid ${isSelected ? "#3B82F6" : "transparent"}`,
                    backgroundColor: isSelected ? "#18181b40" : "transparent",
                    borderBottom: "1px solid #18181b30",
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={e => !isSelected && (e.currentTarget.style.backgroundColor = "#131315")}
                  onMouseLeave={e => !isSelected && (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div style={{ display: "flex", justifyContent: "between", alignItems: "start", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#f4f4f5", width: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {email.customer?.name || email.sender}
                    </span>
                    <span style={{ fontSize: "10px", color: "#52525b", marginLeft: "auto", fontFamily: "monospace" }}>
                      {formatTime(email.createdAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 650, color: "#e4e4e7", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {email.subject}
                  </div>
                  <div style={{ fontSize: "11px", color: "#71717a", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{
                      display: "inline-block", width: "6px", height: "6px", borderRadius: "50%",
                      backgroundColor: hasReplied ? "#10B981" : "#F59E0B"
                    }} />
                    {hasReplied ? "Replied" : "Pending Review"}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Right Column: Email Content Pane ── */}
      <div className="custom-scrollbar" style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "#0b0b0d", overflowY: "auto", padding: "24px" }}>
        {activeEmail ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            
            {/* Header info */}
            <div style={{ borderBottom: "1px solid #18181b", paddingBottom: "16px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 800, color: "#f4f4f5", margin: "0 0 12px 0" }}>
                {activeEmail.subject}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#a1a1aa" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#1c1c1f", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={13} color="#a1a1aa" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: "#f4f4f5" }}>{activeEmail.customer?.name || "Customer"}</div>
                  <div>From: {activeEmail.sender}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right", color: "#71717a", fontFamily: "monospace" }}>
                  {formatDate(activeEmail.createdAt)} {formatTime(activeEmail.createdAt)}
                </div>
              </div>
            </div>

            {/* Email Body */}
            <Card style={{ backgroundColor: "#09090b", border: "1px solid #18181b", padding: "20px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "#d4d4d8", lineHeight: "22px", whiteSpace: "pre-wrap" }}>
                {activeEmail.body.replace(/^\[inbound:[^\]]+\]\s*/, "")}
              </p>
            </Card>

            {/* Replies history */}
            {activeReplies.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ fontSize: "10px", color: "#52525b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", margin: 0 }}>
                  Agent Reply History
                </p>
                {activeReplies.map(reply => (
                  <Card key={reply.id} style={{ backgroundColor: "#18181b30", border: reply.status === "SENT" ? "1px solid #10B98125" : "1px solid #EF444425", padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{
                        display: "inline-block", fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px",
                        backgroundColor: reply.status === "SENT" ? "#10B98120" : "#EF444420",
                        color: reply.status === "SENT" ? "#10B981" : "#EF4444",
                        textTransform: "uppercase", letterSpacing: "0.3px"
                      }}>
                        {reply.status === "SENT" ? "Sent Successfully" : "Delivery Failed"}
                      </span>
                      <span style={{ fontSize: "10px", color: "#52525b", marginLeft: "auto", fontFamily: "monospace" }}>
                        {formatDate(reply.createdAt)} {formatTime(reply.createdAt)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: "12px", color: "#a1a1aa", lineHeight: "20px", whiteSpace: "pre-wrap" }}>
                      {reply.body}
                    </p>
                  </Card>
                ))}
              </div>
            )}

            {/* Response Form */}
            <div style={{ borderTop: "1px solid #18181b", paddingTop: "20px", marginTop: "10px" }}>
              <p style={{ fontSize: "10px", color: "#52525b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 10px 0" }}>
                Draft Manual Response
              </p>
              <form onSubmit={handleSendManualReply} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <textarea
                  value={composeReplyText}
                  onChange={e => setComposeReplyText(e.target.value)}
                  placeholder={`Write your response to ${activeEmail.customer?.name || activeEmail.sender}...`}
                  rows={4}
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "12px",
                    backgroundColor: "#09090b", border: "1px solid #18181b",
                    borderRadius: "8px", fontSize: "13px", color: "#f4f4f5",
                    outline: "none", resize: "vertical", fontFamily: "inherit"
                  }}
                />
                <button
                  type="submit"
                  disabled={!composeReplyText.trim() || sendingId === activeEmail.sender}
                  style={{
                    alignSelf: "flex-end", display: "flex", alignItems: "center", gap: "6px",
                    padding: "0 20px", height: "36px", borderRadius: "6px",
                    background: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
                    border: "none", color: "#fff", fontSize: "12px", fontWeight: 700,
                    cursor: (!composeReplyText.trim() || sendingId === activeEmail.sender) ? "not-allowed" : "pointer"
                  }}
                >
                  {sendingId === activeEmail.sender ? (
                    <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <Send size={13} />
                  )}
                  Send Reply
                </button>
              </form>
            </div>
            
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#52525b" }}>
            <Mail size={32} style={{ marginBottom: "12px" }} />
            <p style={{ margin: 0, fontSize: "13px", fontStyle: "italic" }}>
              No message selected.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1f1f23;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #27272a;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #1f1f23 transparent;
        }
      `}</style>
    </div>
  )
}
