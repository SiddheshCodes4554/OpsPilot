import React from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import { prisma } from "@/lib/prisma"
import { InboxClient } from "@/components/inbox/InboxClient"

export default async function InboxPage() {
  // Fetch all emails from PostgreSQL/Neon database
  const emails = await prisma.email.findMany({
    include: {
      customer: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  // Format dates and decimal values to ensure clean Next.js client-side serialization
  const serializedEmails = emails.map((email) => ({
    ...email,
    createdAt: email.createdAt.toISOString(),
    updatedAt: email.updatedAt.toISOString(),
    customer: email.customer
      ? {
          ...email.customer,
          createdAt: email.customer.createdAt.toISOString(),
          updatedAt: email.customer.updatedAt.toISOString(),
        }
      : null,
  }))

  return (
    <PageContainer
      title="Inbox Communications"
      description="Manage and review customer email notifications in real time."
    >
      <InboxClient initialEmails={serializedEmails} />
    </PageContainer>
  )
}
