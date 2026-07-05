import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://placeholder:5432/db",
  },
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
})
