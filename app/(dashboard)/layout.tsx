import React from "react"
import { UserButton } from "@clerk/nextjs"
import { currentUser } from "@clerk/nextjs/server"
import { DashboardShell } from "@/components/layout/DashboardShell"
import { Sidebar } from "@/components/layout/Sidebar"
import { NotificationCenter } from "@/components/layout/NotificationCenter"

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
        { label: "Dashboard",      href: "/dashboard",  icon: "dashboard"  },
        { label: "Inbox",          href: "/inbox",       icon: "inbox"      },
        { label: "Orders",         href: "/orders",      icon: "orders"     },
        { label: "Inventory",      href: "/inventory",   icon: "inventory"  },
        { label: "Procurement",    href: "/procurement", icon: "procurement"},
        { label: "Suppliers",      href: "/suppliers",   icon: "users"      },
        { label: "Approvals",      href: "/approvals",   icon: "approvals"  },

        { label: "Email History",  href: "/emails",      icon: "mail"       },
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
    <div className="flex items-center gap-3.5">
      <div className="text-zinc-500 text-[11px] font-medium px-2 py-1 rounded bg-zinc-900 border border-zinc-800">
        Command + K
      </div>
      <NotificationCenter />
    </div>
  )

  return (
    <DashboardShell
      sidebar={sidebar}
      breadcrumbs={breadcrumbs}
      navbarActions={navbarActions}
    >
      {children}
    </DashboardShell>
  )
}
