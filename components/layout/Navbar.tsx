"use client"

import React from "react"
import { Menu, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavbarProps extends React.HTMLAttributes<HTMLDivElement> {
  breadcrumbs?: string[]
  onMenuToggle?: () => void
  actions?: React.ReactNode
}

export function Navbar({
  breadcrumbs = [],
  onMenuToggle,
  actions,
  className,
  ...props
}: NavbarProps) {
  return (
    <header
      className={cn(
        "h-14 w-full bg-zinc-950 border-b border-zinc-900 flex items-center justify-between px-4 select-none shrink-0",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="h-3 w-3 text-zinc-700" />}
              <span className={cn(idx === breadcrumbs.length - 1 ? "text-zinc-200" : "hover:text-zinc-300 cursor-pointer")}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right side actions */}
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  )
}
