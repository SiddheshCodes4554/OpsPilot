import React from "react"
import Link from "next/link"
import { PageContainer } from "@/components/layout/PageContainer"
import { Card } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"

interface InboxPageProps {
  searchParams: Promise<{ id?: string }>
}

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const params = await searchParams
  const selectedId = params.id

  // Fetch all emails from PostgreSQL/Neon database
  const emails = await prisma.email.findMany({
    include: {
      customer: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Fetch full details of selected email if an ID exists in URL search params
  const selectedEmail = selectedId
    ? await prisma.email.findUnique({
        where: { id: selectedId },
        include: {
          customer: true,
        },
      })
    : null

  // Priority color helper
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return "text-red-400 bg-red-950/30 border-red-900/50"
      case "MEDIUM":
        return "text-amber-400 bg-amber-950/30 border-amber-900/50"
      default:
        return "text-zinc-400 bg-zinc-900 border-zinc-800"
    }
  }

  // Status color helper
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "text-indigo-400 bg-indigo-950/30 border-indigo-900/50"
      case "SENT":
        return "text-emerald-400 bg-emerald-950/30 border-emerald-900/50"
      case "FAILED":
        return "text-rose-400 bg-rose-950/30 border-rose-900/50"
      default: // RECEIVED
        return "text-zinc-300 bg-zinc-900 border-zinc-800"
    }
  }

  return (
    <PageContainer
      title="Inbox Communications"
      description="Manage and review customer email notifications. Select any thread to review full details."
    >
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-170px)] min-h-[500px]">
        {/* Left Panel: Gmail-style list */}
        <div className="flex-1 lg:max-w-xl flex flex-col h-full">
          <Card className="flex-1 flex flex-col overflow-hidden bg-zinc-950 border-zinc-900">
            {/* Header row */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950/50">
              <span className="text-xs font-semibold text-zinc-300">
                All Communications ({emails.length})
              </span>
              <span className="text-[10px] text-zinc-500 font-medium">Sorted by Received Date</span>
            </div>

            {/* Email list container */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-900 divide-opacity-60">
              {emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-xs py-8">
                  No emails available in database.
                </div>
              ) : (
                emails.map((email) => {
                  const isSelected = email.id === selectedId
                  return (
                    <Link
                      key={email.id}
                      href={`/inbox?id=${email.id}`}
                      className={`block p-4 transition-colors hover:bg-zinc-900/40 ${
                        isSelected ? "bg-zinc-900/60" : "bg-transparent"
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Row 1: Sender & Time */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs text-zinc-250 truncate">
                            {email.customer?.name || email.sender}
                          </span>
                          <span className="text-[10px] text-zinc-500 whitespace-nowrap shrink-0">
                            {email.createdAt.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>

                        {/* Row 2: Subject */}
                        <div className="text-xs text-zinc-400 font-medium truncate">
                          {email.subject}
                        </div>

                        {/* Row 3: Badges */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getStatusStyle(
                              email.status
                            )}`}
                          >
                            {email.status.toLowerCase()}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getPriorityStyle(
                              email.priority
                            )}`}
                          >
                            {email.priority.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Panel: Email Details Preview */}
        <div className="flex-1 flex flex-col h-full min-w-0">
          <Card className="flex-1 overflow-y-auto bg-zinc-950 border-zinc-900 flex flex-col">
            {selectedEmail ? (
              <div className="p-6 flex-1 flex flex-col h-full">
                {/* Details Header */}
                <div className="space-y-4 pb-5 border-b border-zinc-900">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <h2 className="text-base font-bold text-zinc-150 tracking-tight leading-snug">
                      {selectedEmail.subject}
                    </h2>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusStyle(
                          selectedEmail.status
                        )}`}
                      >
                        {selectedEmail.status}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPriorityStyle(
                          selectedEmail.priority
                        )}`}
                      >
                        {selectedEmail.priority}
                      </span>
                    </div>
                  </div>

                  {/* Sender, Recipient & Time Details */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs gap-2 pt-1 text-zinc-400">
                    <div>
                      <div>
                        <span className="text-zinc-500 font-medium">From:</span>{" "}
                        <span className="font-semibold text-zinc-300">
                          {selectedEmail.customer?.name || "Unknown"}
                        </span>{" "}
                        <code className="text-zinc-500 text-[10px]">&lt;{selectedEmail.sender}&gt;</code>
                      </div>
                      <div className="mt-0.5">
                        <span className="text-zinc-500 font-medium">To:</span>{" "}
                        <code className="text-zinc-500 text-[10px]">{selectedEmail.recipient}</code>
                      </div>
                    </div>
                    <div className="text-zinc-500 text-[11px] font-medium whitespace-nowrap">
                      {selectedEmail.createdAt.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Optional Customer Profile Card */}
                {selectedEmail.customer && (
                  <div className="my-4 p-3 rounded border border-zinc-900 bg-zinc-950/50 text-[11px] space-y-1">
                    <div className="font-semibold text-zinc-350 text-[10px] uppercase tracking-wider">
                      Customer Profile
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-zinc-450">
                      <div>
                        <span className="text-zinc-650">Company:</span>{" "}
                        <span className="font-medium text-zinc-300">
                          {selectedEmail.customer.company || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-650">Phone:</span>{" "}
                        <span className="font-medium text-zinc-300">
                          {selectedEmail.customer.phone || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-650">Email:</span>{" "}
                        <span className="font-medium text-zinc-300">
                          {selectedEmail.customer.email}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Email Message Body */}
                <div className="flex-1 py-4 text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap font-sans">
                  {selectedEmail.body}
                </div>

                {/* Mock Actions Footer */}
                <div className="pt-4 border-t border-zinc-900 flex items-center justify-between gap-4 mt-auto">
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 rounded text-[11px] font-medium border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 transition-colors">
                      Reply
                    </button>
                    <button className="px-3 py-1.5 rounded text-[11px] font-medium border border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 transition-colors">
                      Forward
                    </button>
                  </div>
                  <button className="px-3 py-1.5 rounded text-[11px] font-medium border border-transparent text-zinc-500 hover:text-zinc-300 transition-colors">
                    Mark as Unread
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-zinc-500 text-xs text-center">
                <div className="p-3 rounded-full bg-zinc-900/50 border border-zinc-800 mb-3 text-zinc-400">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                    />
                  </svg>
                </div>
                Select an email thread from the list to view its full details.
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
