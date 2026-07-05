"use client"

import React, { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Bell, X, CheckCheck } from "lucide-react"

export interface NotificationItem {
  id: string
  title: string
  content: string
  isRead: boolean
  createdAt: string
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)

  // Poll notifications list from database every 3 seconds
  const { data: notifications = [], refetch } = useQuery<NotificationItem[]>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications")
      const json = await res.json()
      if (json.status === "error") {
        throw new Error(json.message || "Failed to fetch notifications")
      }
      return json.data
    },
    refetchInterval: 3000,
  })

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Dynamically classify notification types and priority
  const getMetadata = (title: string, content: string) => {
    const text = `${title} ${content}`.toLowerCase()
    if (
      text.includes("critical") ||
      text.includes("shortage") ||
      text.includes("deficit") ||
      text.includes("rejected")
    ) {
      return {
        type: "CRITICAL",
        priority: "HIGH",
        color: "text-red-400 bg-red-950/30 border-red-900/40",
      }
    }
    if (text.includes("warning") || text.includes("low stock")) {
      return {
        type: "WARNING",
        priority: "MEDIUM",
        color: "text-amber-400 bg-amber-950/30 border-amber-900/40",
      }
    }
    if (text.includes("approval") || text.includes("approve")) {
      return {
        type: "APPROVAL",
        priority: "HIGH",
        color: "text-yellow-400 bg-yellow-950/30 border-yellow-900/40",
      }
    }
    if (text.includes("supplier") || text.includes("po ") || text.includes("purchase order")) {
      return {
        type: "SUPPLIER",
        priority: "MEDIUM",
        color: "text-blue-400 bg-blue-950/30 border-blue-900/40",
      }
    }
    if (text.includes("inventory") || text.includes("stock")) {
      return {
        type: "INVENTORY",
        priority: "MEDIUM",
        color: "text-purple-400 bg-purple-950/30 border-purple-900/40",
      }
    }
    return {
      type: "SUCCESS",
      priority: "LOW",
      color: "text-emerald-400 bg-emerald-950/30 border-emerald-900/40",
    }
  }

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (json.status === "success") {
        refetch()
      }
    } catch (err) {
      console.error("[NotificationCenter] Failed to mark as read:", err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      })
      const json = await res.json()
      if (json.status === "success") {
        refetch()
      }
    } catch (err) {
      console.error("[NotificationCenter] Failed to mark all as read:", err)
    }
  }

  return (
    <div className="relative font-sans text-zinc-50">
      {/* Bell Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all cursor-pointer"
        aria-label="Toggle notifications center"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 text-[8px] font-bold items-center justify-center text-white">
              {unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          {/* Dismiss overlay click */}
          <div className="flex-1" onClick={() => setIsOpen(false)} />

          {/* Drawer Content */}
          <aside className="w-85 max-w-full h-full bg-zinc-950 border-l border-zinc-900 flex flex-col shadow-2xl animate-slide-in">
            {/* Header */}
            <div className="h-14 px-4 border-b border-zinc-900 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Workspace Alerts
              </span>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    title="Mark all as read"
                    className="p-1.5 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/60 p-4 space-y-4">
              {notifications.length === 0 ? (
                <div className="text-center text-zinc-650 text-xs italic py-12">
                  No notifications recorded yet.
                </div>
              ) : (
                notifications.map((n) => {
                  const meta = getMetadata(n.title, n.content)
                  const timeStr = new Date(n.createdAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })

                  return (
                    <button
                      key={n.id}
                      onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                      className={`w-full text-left block py-3 px-3.5 rounded-lg border transition-all duration-150 ${
                        n.isRead
                          ? "bg-transparent border-transparent hover:bg-zinc-900/20"
                          : "bg-zinc-900/30 border-zinc-900 hover:border-zinc-800/80"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold border tracking-wider uppercase ${meta.color}`}
                          >
                            {meta.type} | {meta.priority}
                          </span>
                          <span className="text-[9px] text-zinc-600 font-mono">{timeStr}</span>
                        </div>

                        <div className="flex items-start gap-2">
                          {!n.isRead && (
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          )}
                          <div className="space-y-0.5 min-w-0">
                            <h4
                              className={`text-xs font-semibold truncate ${
                                n.isRead ? "text-zinc-400" : "text-zinc-150"
                              }`}
                            >
                              {n.title}
                            </h4>
                            <p className="text-[10px] text-zinc-500 leading-relaxed break-words">
                              {n.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
