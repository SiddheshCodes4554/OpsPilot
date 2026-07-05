import React from "react"
import Link from "next/link"
import { LayoutDashboard, Users, Settings, Activity, LogIn } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Workforce", href: "#", icon: Users },
    { label: "Operations", href: "#", icon: Activity },
    { label: "Settings", href: "#", icon: Settings },
  ]

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar navigation */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-zinc-250 dark:border-zinc-800 bg-white dark:bg-zinc-950 z-20">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Header/Logo */}
          <div className="flex items-center h-16 px-6 border-b border-zinc-100 dark:border-zinc-900 gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-lg shadow-sm">
              O
            </div>
            <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-50">
              OpsPilot AI
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center px-4 py-2 text-sm font-medium rounded-lg text-zinc-650 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-900 transition-colors gap-3"
              >
                <item.icon className="h-4.5 w-4.5 shrink-0" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Footer profile mockup */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 flex items-center justify-center font-semibold text-sm">
                JD
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                  John Doe
                </p>
                <p className="text-[10px] text-zinc-400 truncate">
                  admin@opspilot.ai
                </p>
              </div>
              <Link
                href="/login"
                title="Sign In Screen"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 transition-colors"
              >
                <LogIn className="h-4.5 w-4.5" />
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area Wrapper */}
      <div className="flex flex-col flex-1 md:pl-64">
        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between h-16 px-4 bg-white dark:bg-zinc-950 border-b border-zinc-150 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-sm">
              O
            </div>
            <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-50">
              OpsPilot AI
            </span>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            <LogIn className="h-4 w-4" />
            Login
          </Link>
        </header>

        {/* Root layout child inject */}
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  )
}
