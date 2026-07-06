require('dotenv').config()
const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")
const pg = require("pg")

const connectionString = process.env.DATABASE_URL
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("=== SEARCHING EMAILS ===")
  const emails = await prisma.email.findMany({
    where: {
      OR: [
        { sender: { contains: "siddheshgawade" } },
        { recipient: { contains: "siddheshgawade" } },
        { subject: { contains: "product" } },
        { body: { contains: "product" } }
      ]
    },
    orderBy: { createdAt: "desc" }
  })
  
  console.log(`Found ${emails.length} emails:`)
  for (const e of emails) {
    console.log(`[${e.status}] ID: ${e.id} | From: ${e.sender} | To: ${e.recipient} | Subject: ${e.subject} | Created: ${e.createdAt}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
