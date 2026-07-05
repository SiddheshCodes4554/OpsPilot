"use client"

import React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActivityPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  onClose?: () => void
  children?: React.ReactNode
  footer?: React.ReactNode
}

export function ActivityPanel({
  title = "Activity Log",
  onClose,
  children,
  footer,
  className,
  ...props
}: ActivityPanelProps) {
  return (
    <aside
      className={cn(
        "w-80 shrink-0 flex flex-col h-full bg-zinc-950 border-l border-zinc-900 text-zinc-400 select-none",
        className
      )}
      {...props}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-900">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
          {title}
        </span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-900 text-zinc-500 hover:text-zinc-350 transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {children}
      </div>

      {/* Optional Footer */}
      {footer && (
        <div className="p-4 border-t border-zinc-900 text-xs bg-zinc-950">
          {footer}
        </div>
      )}
    </aside>
  )
}
