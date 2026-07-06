require('dotenv').config()
const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")
const pg = require("pg")

const connectionString = process.env.DATABASE_URL || "postgresql://placeholder:5432/db"
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("=== LATEST EMAILS ===")
  const emails = await prisma.email.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { customer: true }
  })
  for (const e of emails) {
    console.log(`[${e.status}] ID: ${e.id} | From: ${e.sender} | To: ${e.recipient} | Subject: ${e.subject}`)
  }

  console.log("\n=== LATEST AGENT LOGS ===")
  const logs = await prisma.agentLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10
  })
  for (const l of logs) {
    console.log(`[${l.level}] [${l.agentName}] ${l.message.substring(0, 80)}...`)
  }

  console.log("\n=== LATEST APPROVALS ===")
  const approvals = await prisma.approval.findMany({
    orderBy: { createdAt: "desc" },
    take: 3
  })
  for (const a of approvals) {
    console.log(`[${a.status}] Type: ${a.type} | Requester: ${a.requester} | Details: ${JSON.stringify(a.details)}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
