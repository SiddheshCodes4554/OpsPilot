import React from "react"
import { Activity } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export async function InventoryHealth() {
  const inventory = await prisma.inventory.findMany({
    select: {
      quantity: true,
      minStockLevel: true,
    },
  })

  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0)
  const outOfStock = inventory.filter((item) => item.quantity === 0).length
  const lowStock = inventory.filter((item) => item.quantity > 0 && item.quantity <= item.minStockLevel).length

  let healthStatus = "Healthy"
  let statusColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
  let dotColor = "bg-emerald-500"

  if (outOfStock > 0) {
    healthStatus = "Critical"
    statusColor = "text-red-500 bg-red-500/10 border-red-500/20"
    dotColor = "bg-red-500"
  } else if (lowStock > 0) {
    healthStatus = "Attention"
    statusColor = "text-amber-500 bg-amber-500/10 border-amber-500/20"
    dotColor = "bg-amber-500"
  }

  return (
    <Card hoverEffect>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-zinc-400">Inventory Health</CardTitle>
          <CardDescription className="text-[10px] text-zinc-500">Overall stock level assessment</CardDescription>
        </div>
        <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
          <Activity className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-2 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold tracking-tight text-zinc-100">
            {totalItems} <span className="text-xs font-normal text-zinc-500">units</span>
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColor}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dotColor} ${healthStatus !== "Healthy" && "animate-pulse"}`} />
            {healthStatus}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-500">
          <div className="p-2 border border-zinc-900 bg-zinc-950/50 rounded">
            <div className="text-zinc-400 font-semibold">{outOfStock}</div>
            <div>Out of stock</div>
          </div>
          <div className="p-2 border border-zinc-900 bg-zinc-950/50 rounded">
            <div className="text-zinc-400 font-semibold">{lowStock}</div>
            <div>Low stock alert</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
