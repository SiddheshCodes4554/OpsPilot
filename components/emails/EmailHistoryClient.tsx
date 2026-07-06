"use client"

import React, { useState, useCallback, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Search,
  Mail,
  Send,
  FileText,
  AlertTriangle,
  Inbox,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  User,
  Clock,
  Tag,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailCustomer {
  id: string
  name: string
  email: string
}

interface Email {
  id: string
  subject: string
  body: string
  status: "SENT" | "RECEIVED" | "DRAFT" | "FAILED"
  priority: "LOW" | "MEDIUM" | "HIGH"
  sender: string
  recipient: string
  createdAt: string
  updatedAt: string
  customer: EmailCustomer | null
}

interface EmailsResponse {
  status: string
  data: {
    emails: Email[]
    pagination: { total: number; page: number; limit: number; pages: number }
    counts: { SENT: number; RECEIVED: number; DRAFT: number; FAILED: number; ALL: number }
  }
}

type TabKey = "ALL" | "SENT" | "RECEIVED" | "DRAFT" | "FAILED"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TAB_CONFIG: { key: TabKey; label: string; icon: React.ElementType; color: string }[] = [
  { key: "ALL",      label: "All",      icon: Mail,          color: "#8B5CF6" },
  { key: "SENT",     label: "Outgoing", icon: Send,          color: "#10B981" },
  { key: "RECEIVED", label: "Incoming", icon: Inbox,         color: "#3B82F6" },
  { key: "DRAFT",    label: "Drafts",   icon: FileText,      color: "#F59E0B" },
  { key: "FAILED",   label: "Failed",   icon: AlertTriangle, color: "#EF4444" },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  SENT:     { label: "Sent",     color: "#10B981", bg: "#10B98120", icon: CheckCircle2  },
  RECEIVED: { label: "Received", color: "#3B82F6", bg: "#3B82F620", icon: ArrowDownLeft },
  DRAFT:    { label: "Draft",    color: "#F59E0B", bg: "#F59E0B20", icon: FileText      },
  FAILED:   { label: "Failed",   color: "#EF4444", bg: "#EF444420", icon: AlertCircle   },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  HIGH:   { label: "High",   color: "#EF4444" },
  MEDIUM: { label: "Medium", color: "#F59E0B" },
  LOW:    { label: "Low",    color: "#6B7280" },
}

function inferType(email: Email): string {
  const s = email.subject?.toLowerCase() ?? ""
  const from = email.sender?.toLowerCase() ?? ""
  if (s.includes("order confirm"))                          return "Order Confirmation"
  if (s.includes("purchase order") || from.includes("procurement")) return "Purchase Order"
  if (s.includes("warranty"))                               return "Warranty"
  if (s.includes("refund"))                                 return "Refund"
  if (s.includes("return"))                                 return "Return"
  if (s.includes("complaint"))                              return "Complaint"
  if (s.includes("approval") || from.includes("approval")) return "Approval"
  if (s.includes("alert") || s.includes("stock"))          return "Inventory Alert"
  if (email.status === "RECEIVED")                          return "Incoming"
  return "Reply"
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 1)   return "Just now"
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatDateFull(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short", year: "numeric", month: "long",
    day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

// Detect if the body is HTML or plain text
function isHtmlBody(body: string): boolean {
  return /<[a-z][\s\S]*>/i.test(body)
}

async function fetchEmails(tab: TabKey, search: string, page: number): Promise<EmailsResponse> {
  const params = new URLSearchParams({ status: tab, page: String(page), limit: "40" })
  if (search.trim()) params.set("search", search.trim())
  const res = await fetch(`/api/emails?${params}`)
  if (!res.ok) throw new Error("Failed to fetch emails")
  return res.json()
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EmailDetailPanel({ email, onClose }: { email: Email; onClose: () => void }) {
  const htmlBody  = isHtmlBody(email.body)
  const statusCfg = STATUS_CONFIG[email.status] ?? STATUS_CONFIG.SENT
  const priCfg    = PRIORITY_CONFIG[email.priority] ?? PRIORITY_CONFIG.LOW
  const StatusIcon = statusCfg.icon

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#111",
        borderLeft: "1px solid #27272a",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #27272a",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "15px", fontWeight: 600, color: "#f4f4f5", margin: "0 0 8px 0", lineHeight: 1.4 }}>
            {email.subject}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
            {/* Status */}
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "4px",
              fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "4px",
              backgroundColor: statusCfg.bg, color: statusCfg.color,
              border: `1px solid ${statusCfg.color}40`,
              textTransform: "uppercase", letterSpacing: "0.4px",
            }}>
              <StatusIcon size={9} />
              {statusCfg.label}
            </span>
            {/* Priority */}
            <span style={{
              fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "4px",
              backgroundColor: priCfg.color + "18", color: priCfg.color,
              border: `1px solid ${priCfg.color}40`,
              textTransform: "uppercase", letterSpacing: "0.4px",
            }}>
              {priCfg.label}
            </span>
            {/* Type */}
            <span style={{
              fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "4px",
              backgroundColor: "#27272a", color: "#a1a1aa",
            }}>
              {inferType(email)}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            flexShrink: 0, background: "none", border: "none", cursor: "pointer",
            color: "#71717a", padding: "2px",
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Metadata */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #27272a", flexShrink: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {[
            { icon: ArrowUpRight, label: "From",      value: email.sender },
            { icon: ArrowDownLeft, label: "To",       value: email.recipient },
            { icon: User,         label: "Customer",  value: email.customer?.name ?? "—" },
            { icon: Clock,        label: "Sent",      value: formatDateFull(email.createdAt) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <p style={{ fontSize: "10px", color: "#52525b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", margin: "0 0 2px 0" }}>
                {label}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Icon size={11} color="#52525b" />
                <p style={{ fontSize: "12px", color: "#a1a1aa", margin: 0, wordBreak: "break-all" }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{
          padding: "10px 20px 8px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <p style={{ fontSize: "10px", color: "#52525b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", margin: 0 }}>
            {htmlBody ? "HTML Preview" : "Message Body"}
          </p>
          {htmlBody && (
            <span style={{ fontSize: "10px", color: "#3B82F6", backgroundColor: "#3B82F615", padding: "2px 6px", borderRadius: "4px" }}>
              Rendered HTML
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflow: "hidden", margin: "0 0 16px 0" }}>
          {htmlBody ? (
            <iframe
              srcDoc={email.body}
              title="Email HTML Preview"
              style={{
                width: "100%", height: "100%", border: "none",
                backgroundColor: "#fff", display: "block",
              }}
              sandbox="allow-same-origin"
            />
          ) : (
            <div style={{
              margin: "0 20px",
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: "6px",
              padding: "16px",
              height: "calc(100% - 32px)",
              overflowY: "auto",
            }}>
              <p style={{
                fontSize: "13px", color: "#d4d4d8", lineHeight: "22px",
                margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit",
              }}>
                {email.body}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ tab, search }: { tab: TabKey; search: string }) {
  const Icon = TAB_CONFIG.find(t => t.key === tab)?.icon ?? Mail
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", gap: "12px" }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#27272a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={22} color="#52525b" />
      </div>
      <p style={{ fontSize: "14px", fontWeight: 600, color: "#a1a1aa", margin: 0 }}>
        {search ? `No emails matching "${search}"` : `No ${tab === "ALL" ? "" : tab.toLowerCase() + " "}emails`}
      </p>
      <p style={{ fontSize: "12px", color: "#52525b", margin: 0 }}>
        {search ? "Try a different search term or clear the filter." : "Emails will appear here once they are generated by agents."}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EmailHistoryClient() {
  const [activeTab, setActiveTab]   = useState<TabKey>("ALL")
  const [search, setSearch]         = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage]             = useState(1)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search input
  const handleSearch = useCallback((val: string) => {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 350)
  }, [])

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab)
    setPage(1)
    setSelectedEmail(null)
  }

  const { data, isLoading, isError, refetch, isFetching } = useQuery<EmailsResponse>({
    queryKey: ["emails", activeTab, debouncedSearch, page],
    queryFn: () => fetchEmails(activeTab, debouncedSearch, page),
    refetchInterval: 10_000,
    staleTime: 5_000,
  })

  const emails = data?.data?.emails ?? []
  const pagination = data?.data?.pagination
  const counts = data?.data?.counts

  // Auto-select first email when list changes and nothing selected
  useEffect(() => {
    if (emails.length > 0 && !selectedEmail) {
      setSelectedEmail(emails[0])
    }
  }, [emails]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%",
      backgroundColor: "#09090b", color: "#f4f4f5",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px 0", flexShrink: 0, gap: "16px",
      }}>
        <div>
          <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#f4f4f5", margin: "0 0 2px 0" }}>
            Email History
          </h1>
          <p style={{ fontSize: "12px", color: "#52525b", margin: 0 }}>
            All emails generated and received by OpsPilot AI
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            backgroundColor: "#18181b", border: "1px solid #27272a",
            borderRadius: "8px", padding: "0 12px", height: "36px", minWidth: "240px",
          }}>
            <Search size={13} color="#52525b" style={{ flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search subject, sender, recipient…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                fontSize: "12px", color: "#d4d4d8",
                caretColor: "#3B82F6",
              }}
            />
            {search && (
              <button
                onClick={() => handleSearch("")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#52525b", padding: 0, lineHeight: 0 }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "0 12px", height: "36px", borderRadius: "8px",
              backgroundColor: "#18181b", border: "1px solid #27272a",
              cursor: "pointer", fontSize: "12px", color: "#71717a",
              transition: "color 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "#d4d4d8")}
            onMouseLeave={e => (e.currentTarget.style.color = "#71717a")}
          >
            <RefreshCw size={13} style={{ animation: isFetching ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: "2px", padding: "12px 20px 0",
        borderBottom: "1px solid #18181b", flexShrink: 0,
      }}>
        {TAB_CONFIG.map(({ key, label, icon: Icon, color }) => {
          const count = counts?.[key] ?? 0
          const isActive = activeTab === key
          return (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "7px 14px", borderRadius: "6px 6px 0 0",
                border: "1px solid transparent",
                borderBottom: isActive ? "1px solid #09090b" : "1px solid transparent",
                backgroundColor: isActive ? "#09090b" : "transparent",
                cursor: "pointer", fontSize: "12px", fontWeight: isActive ? 600 : 500,
                color: isActive ? color : "#52525b",
                marginBottom: isActive ? "-1px" : "0",
                transition: "all 0.15s",
                outline: "none",
              }}
            >
              <Icon size={13} />
              {label}
              {count > 0 && (
                <span style={{
                  fontSize: "10px", fontWeight: 700,
                  padding: "1px 5px", borderRadius: "10px",
                  backgroundColor: isActive ? color + "20" : "#27272a",
                  color: isActive ? color : "#71717a",
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Left: email list */}
        <div style={{
          width: selectedEmail ? "42%" : "100%",
          display: "flex", flexDirection: "column",
          borderRight: selectedEmail ? "1px solid #27272a" : "none",
          overflow: "hidden", transition: "width 0.2s ease",
        }}>
          {/* Column headers */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 100px 90px 80px",
            padding: "8px 20px",
            borderBottom: "1px solid #18181b",
            backgroundColor: "#0a0a0b",
            flexShrink: 0,
          }}>
            {["Recipient / Sender", "Subject", "Type", "Status", "Date"].map(h => (
              <span key={h} style={{ fontSize: "10px", fontWeight: 700, color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {isLoading ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#3f3f46", fontSize: "13px" }}>
                Loading emails…
              </div>
            ) : isError ? (
              <div style={{ padding: "48px", textAlign: "center", color: "#EF4444", fontSize: "13px" }}>
                Failed to load emails. Please refresh.
              </div>
            ) : emails.length === 0 ? (
              <EmptyState tab={activeTab} search={debouncedSearch} />
            ) : (
              emails.map(email => {
                const isSelected = selectedEmail?.id === email.id
                const statusCfg = STATUS_CONFIG[email.status] ?? STATUS_CONFIG.SENT
                const isOutgoing = email.status === "SENT" || email.status === "DRAFT"

                return (
                  <div
                    key={email.id}
                    onClick={() => setSelectedEmail(email)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 100px 90px 80px",
                      padding: "11px 20px",
                      borderBottom: "1px solid #18181b",
                      cursor: "pointer",
                      backgroundColor: isSelected ? "#18181b" : "transparent",
                      borderLeft: isSelected ? `3px solid ${statusCfg.color}` : "3px solid transparent",
                      transition: "background-color 0.1s",
                      alignItems: "center",
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#131315" }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent" }}
                  >
                    {/* Recipient / Sender */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        {isOutgoing
                          ? <ArrowUpRight size={10} color="#10B981" style={{ flexShrink: 0 }} />
                          : <ArrowDownLeft size={10} color="#3B82F6" style={{ flexShrink: 0 }} />
                        }
                        <span style={{
                          fontSize: "12px", fontWeight: 600, color: "#d4d4d8",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {isOutgoing ? email.recipient : email.sender}
                        </span>
                      </div>
                      {email.customer && (
                        <span style={{ fontSize: "10px", color: "#52525b" }}>
                          {email.customer.name}
                        </span>
                      )}
                    </div>

                    {/* Subject */}
                    <span style={{
                      fontSize: "12px", color: "#a1a1aa",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      paddingRight: "8px",
                    }}>
                      {email.subject}
                    </span>

                    {/* Type */}
                    <span style={{
                      fontSize: "10px", color: "#71717a",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {inferType(email)}
                    </span>

                    {/* Status badge */}
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "4px",
                      fontSize: "9px", fontWeight: 700,
                      padding: "2px 6px", borderRadius: "4px",
                      backgroundColor: statusCfg.bg, color: statusCfg.color,
                      border: `1px solid ${statusCfg.color}40`,
                      textTransform: "uppercase", letterSpacing: "0.3px",
                      width: "fit-content",
                    }}>
                      {statusCfg.label}
                    </span>

                    {/* Date */}
                    <span style={{ fontSize: "11px", color: "#52525b", whiteSpace: "nowrap" }}>
                      {formatDate(email.createdAt)}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 20px", borderTop: "1px solid #18181b",
              backgroundColor: "#0a0a0b", flexShrink: 0,
            }}>
              <span style={{ fontSize: "11px", color: "#52525b" }}>
                {((page - 1) * pagination.limit) + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: "4px 8px", borderRadius: "4px", border: "1px solid #27272a",
                    backgroundColor: "#18181b", cursor: page === 1 ? "not-allowed" : "pointer",
                    color: page === 1 ? "#3f3f46" : "#a1a1aa", display: "flex", alignItems: "center",
                  }}
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                  style={{
                    padding: "4px 8px", borderRadius: "4px", border: "1px solid #27272a",
                    backgroundColor: "#18181b", cursor: page >= pagination.pages ? "not-allowed" : "pointer",
                    color: page >= pagination.pages ? "#3f3f46" : "#a1a1aa", display: "flex", alignItems: "center",
                  }}
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: email detail */}
        {selectedEmail && (
          <div style={{ flex: 1, overflow: "hidden" }}>
            <EmailDetailPanel email={selectedEmail} onClose={() => setSelectedEmail(null)} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        *::-webkit-scrollbar { width: 4px; height: 4px; }
        *::-webkit-scrollbar-track { background: transparent; }
        *::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
      `}</style>
    </div>
  )
}
