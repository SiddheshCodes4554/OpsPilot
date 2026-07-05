import React from "react"
import { AlertCircle } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export async function LowStockItems() {
  const lowStock = await prisma.inventory.findMany({
    where: {
      quantity: {
        lte: 10, // minStockLevel defaults to 10 in the schema
      },
    },
    include: {
      product: {
        select: {
          sku: true,
          name: true,
        },
      },
    },
    orderBy: {
      quantity: "asc",
    },
    take: 5,
  })

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-zinc-400">Low Stock Alert</CardTitle>
          <CardDescription className="text-[10px] text-zinc-500">Inventory items needing replenishment</CardDescription>
        </div>
        <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
          <AlertCircle className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2.5">
          {lowStock.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">All stock levels are optimal.</p>
          ) : (
            lowStock.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded border border-zinc-900 bg-zinc-950/30 text-xs"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="font-medium text-zinc-300 truncate">{item.product.name}</div>
                  <div className="text-[10px] text-zinc-550 font-mono tracking-wider mt-0.5">{item.product.sku}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-zinc-200 font-mono">
                    {item.quantity} <span className="text-[9px] font-normal text-zinc-500">/ {item.minStockLevel}</span>
                  </div>
                  <div className="text-[9px] text-red-400/90 font-semibold uppercase tracking-wider mt-0.5">
                    Refill needed
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
