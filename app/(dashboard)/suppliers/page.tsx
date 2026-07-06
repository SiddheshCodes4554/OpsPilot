import React from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import { prisma } from "@/lib/prisma"
import { SuppliersClient } from "@/components/suppliers/SuppliersClient"

export const dynamic = "force-dynamic"

export default async function SuppliersPage() {
  // Fetch initial list of suppliers from PostgreSQL database
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
  })

  return (
    <PageContainer
      title="Wholesale Suppliers"
      description="Register supplier partners, manage contact profiles, and track wholesale details."
    >
      <SuppliersClient initialSuppliers={suppliers} />
    </PageContainer>
  )
}
