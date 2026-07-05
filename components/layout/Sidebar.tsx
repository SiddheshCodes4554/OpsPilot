"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { HelpCircle, LayoutDashboard, Users, Activity, Settings, Inbox, Boxes, Truck } from "lucide-react"
import { cn } from "@/lib/utils"

const iconMap = {
  dashboard: LayoutDashboard,
  users: Users,
  activity: Activity,
  settings: Settings,
  inbox: Inbox,
  inventory: Boxes,
  procurement: Truck,
}

export interface SidebarItem {
  label: string
  href: string
  icon: string
  badge?: string
}

export interface SidebarGroup {
  title?: string
  items: SidebarItem[]
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  groups: SidebarGroup[]
  workspaceName?: string
  workspaceAvatar?: string
  userSlot?: React.ReactNode
}

export function Sidebar({
  groups,
  workspaceName = "OpsPilot Workspace",
  workspaceAvatar = "O",
  userSlot,
  className,
  ...props
}: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "w-60 shrink-0 flex flex-col h-full bg-zinc-950 border-r border-zinc-900 text-zinc-400 select-none",
        className
      )}
      {...props}
    >
      {/* Workspace Selector (Linear style: top header panel) */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-zinc-900">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-200 text-xs font-semibold select-none">
            {workspaceAvatar}
          </div>
          <span className="font-medium text-sm text-zinc-200 truncate tracking-tight">
            {workspaceName}
          </span>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6 scrollbar-thin">
        {groups.map((group, index) => (
          <div key={index} className="space-y-1">
            {group.title && (
              <div className="px-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                {group.title}
              </div>
            )}
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-3 py-1.5 rounded text-xs font-medium transition-colors gap-2.5",
                      isActive
                        ? "bg-zinc-900 text-zinc-50"
                        : "hover:text-zinc-200 hover:bg-zinc-900/30"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {(() => {
                        const IconComponent = iconMap[item.icon as keyof typeof iconMap] || HelpCircle
                        return <IconComponent className={cn("h-4 w-4 shrink-0", isActive ? "text-zinc-200" : "text-zinc-500")} />
                      })()}
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="inline-flex h-4 items-center rounded-full bg-zinc-850 px-1.5 text-[9px] font-semibold text-zinc-400 border border-zinc-800">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* User slot / Settings at the bottom */}
      {userSlot && (
        <div className="p-3 border-t border-zinc-900">
          {userSlot}
        </div>
      )}
    </aside>
  )
}
