import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search") || ""

    const products = await prisma.product.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        inventory: true,
        supplier: true,
      },
      orderBy: { name: "asc" },
    })

    // Convert decimal prices to numbers for JSON serialization
    const serializedProducts = products.map((product) => ({
      ...product,
      price: Number(product.price),
    }))

    return NextResponse.json({ status: "success", data: serializedProducts })
  } catch (error) {
    console.error("[GET /api/products] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
