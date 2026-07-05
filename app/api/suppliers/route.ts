import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ status: "success", data: suppliers })
  } catch (error) {
    console.error("[GET /api/suppliers] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
