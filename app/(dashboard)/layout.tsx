import React from "react"
import { UserButton } from "@clerk/nextjs"
import { currentUser } from "@clerk/nextjs/server"
import { DashboardShell } from "@/components/layout/DashboardShell"
import { Sidebar } from "@/components/layout/Sidebar"
import { ActivityPanel } from "@/components/layout/ActivityPanel"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()

  const sidebarGroups = [
    {
      title: "Workspace",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
        { label: "Workforce", href: "#", icon: "users", badge: "3" },
        { label: "Operations", href: "#", icon: "activity" },
      ],
    },
    {
      title: "Settings",
      items: [
        { label: "Preferences", href: "#", icon: "settings" },
      ],
    },
  ]

  const userSlot = (
    <div className="flex items-center gap-2.5">
      <UserButton
        appearance={{
          elements: {
            userButtonAvatarBox: "h-6 w-6"
          }
        }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-zinc-200 truncate">
          {user?.fullName || `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User"}
        </p>
      </div>
    </div>
  )

  const sidebar = (
    <Sidebar
      groups={sidebarGroups}
      userSlot={userSlot}
      workspaceName="OpsPilot Workspace"
      workspaceAvatar="O"
    />
  )

  const breadcrumbs = ["OpsPilot AI", "Dashboard"]
  const navbarActions = (
    <div className="text-zinc-500 text-[11px] font-medium px-2 py-1 rounded bg-zinc-900 border border-zinc-800">
      Command + K
    </div>
  )

  const activityPanel = (
    <ActivityPanel title="Workspace Logs">
      <div className="space-y-3">
        <div className="p-3 rounded border border-zinc-900 bg-zinc-950 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-zinc-300">System Boot</span>
            <span className="text-[10px] text-zinc-600">Just now</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">Core workforce services initialized.</p>
        </div>
        <div className="p-3 rounded border border-zinc-900 bg-zinc-950 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-zinc-300">Workspace Sync</span>
            <span className="text-[10px] text-zinc-600">10m ago</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">Schema synced with remote registry.</p>
        </div>
      </div>
    </ActivityPanel>
  )

  return (
    <DashboardShell
      sidebar={sidebar}
      breadcrumbs={breadcrumbs}
      navbarActions={navbarActions}
      activityPanel={activityPanel}
    >
      {children}
    </DashboardShell>
  )
}
