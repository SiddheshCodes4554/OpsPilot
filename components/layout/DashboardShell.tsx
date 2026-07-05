"use client"

import React, { useState } from "react"
import { Navbar } from "./Navbar"

interface DashboardShellProps {
  sidebar: React.ReactNode
  breadcrumbs?: string[]
  navbarActions?: React.ReactNode
  activityPanel?: React.ReactNode
  children: React.ReactNode
}

export function DashboardShell({
  sidebar,
  breadcrumbs = [],
  navbarActions,
  activityPanel,
  children,
}: DashboardShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isActivityPanelOpen, setIsActivityPanelOpen] = useState(true)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans antialiased">
      
      {/* Desktop Sidebar (Left) */}
      <div className="hidden md:flex h-full shrink-0">
        {sidebar}
      </div>

      {/* Mobile Sidebar Overlay (Left) */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="relative flex flex-col h-full animate-slide-in">
            {sidebar}
          </div>
          {/* Click outside to close */}
          <div
            className="flex-1"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Navbar */}
        <Navbar
          breadcrumbs={breadcrumbs}
          actions={navbarActions}
          onMenuToggle={() => setIsMobileSidebarOpen(true)}
        />

        {/* Content & Activity Panel container */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">
          {/* Main scrollable page content */}
          <main className="flex-1 overflow-y-auto min-w-0 relative">
            {children}
          </main>

          {/* Activity Panel (Right) */}
          {activityPanel && isActivityPanelOpen && (
            <div className="hidden xl:flex h-full shrink-0">
              {React.isValidElement(activityPanel)
                ? React.cloneElement(activityPanel as React.ReactElement<{ onClose?: () => void }>, {
                    onClose: () => setIsActivityPanelOpen(false),
                  })
                : activityPanel}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
