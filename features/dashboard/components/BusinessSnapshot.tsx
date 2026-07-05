import React from "react"
import { BarChart3 } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export async function BusinessSnapshot() {
  const [
    productCount,
    customerCount,
    supplierCount,
    allOrders,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.customer.count(),
    prisma.supplier.count(),
    prisma.order.findMany({
      select: {
        totalAmount: true,
      },
    }),
  ])

  const totalSales = allOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)

  const items = [
    { label: "Gross Revenue", value: `$${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { label: "Products Cataloged", value: productCount },
    { label: "Active Suppliers", value: supplierCount },
    { label: "Customer Base", value: customerCount },
  ]

  return (
    <Card hoverEffect>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-zinc-400">Business Snapshot</CardTitle>
          <CardDescription className="text-[10px] text-zinc-500">Gross metrics ledger summary</CardDescription>
        </div>
        <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
          <BarChart3 className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2 text-xs">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 border-b border-zinc-900 last:border-b-0 text-zinc-450"
            >
              <span className="font-medium text-zinc-500">{item.label}</span>
              <span className="font-semibold text-zinc-200 font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
