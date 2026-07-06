require('dotenv').config()
const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")
const pg = require("pg")

const connectionString = process.env.DATABASE_URL
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const errors = await prisma.agentLog.findMany({
    where: { level: "ERROR" },
    orderBy: { createdAt: "desc" },
    take: 5
  })
  
  for (const err of errors) {
    console.log(`\n--- ERROR LOG (${err.id}) ---`)
    console.log(`Agent: ${err.agentName}`)
    console.log(`Action: ${err.action}`)
    console.log(`Message:`)
    console.log(err.message)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
