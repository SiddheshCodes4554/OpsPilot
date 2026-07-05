import React from "react"
import { ClipboardList } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export async function PendingPurchaseOrders() {
  const pendingOrders = await prisma.purchaseOrder.findMany({
    where: {
      status: "PENDING",
    },
    select: {
      totalAmount: true,
    },
  })

  const count = pendingOrders.length
  const totalAmount = pendingOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)

  return (
    <Card hoverEffect>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-zinc-400">Pending Purchase Orders</CardTitle>
          <CardDescription className="text-[10px] text-zinc-500">Procurement awaiting approval</CardDescription>
        </div>
        <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
          <ClipboardList className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="text-2xl font-bold tracking-tight text-zinc-100">
          ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <p className="text-[10px] text-zinc-500 mt-1 font-semibold">
          {count} {count === 1 ? "procurement request" : "procurement requests"} pending
        </p>
      </CardContent>
    </Card>
  )
}
