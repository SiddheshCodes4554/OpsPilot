import React from "react"
import { Bell } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export async function RecentActivity() {
  const notifications = await prisma.notification.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  })

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-zinc-400">Recent Activity</CardTitle>
          <CardDescription className="text-[10px] text-zinc-500">Latest system events and agent outputs</CardDescription>
        </div>
        <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
          <Bell className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">No recent activities logged.</p>
          ) : (
            notifications.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded border border-zinc-900 bg-zinc-950/20 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200">{log.title}</span>
                  <span className="text-[9px] text-zinc-650 font-medium">
                    {log.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">{log.content}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
