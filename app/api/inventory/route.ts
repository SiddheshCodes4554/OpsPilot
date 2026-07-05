import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const inventories = await prisma.inventory.findMany({
      include: {
        product: {
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
            orderItems: {
              include: {
                order: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { product: { name: "asc" } },
    })

    // Convert and calculate properties for JSON response
    const serializedInventories = inventories.map((inv) => {
      const product = inv.product
      let reserved = 0
      let supplierName = "N/A"

      if (product) {
        // Calculate reserved stock from pending and processing orders
        reserved = product.orderItems
          .filter(
            (item) =>
              item.order.status === "PENDING" || item.order.status === "PROCESSING"
          )
          .reduce((sum, item) => sum + item.quantity, 0)

        if (product.supplier) {
          supplierName = product.supplier.name
        }
      }

      return {
        id: inv.id,
        productId: inv.productId,
        quantity: inv.quantity,
        location: inv.location,
        minStockLevel: inv.minStockLevel,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
        reserved,
        productName: product?.name || "Unknown Product",
        productSku: product?.sku || "N/A",
        productPrice: product ? Number(product.price) : 0,
        supplierName,
        supplierId: product?.supplierId || null,
      }
    })

    return NextResponse.json({ status: "success", data: serializedInventories })
  } catch (error) {
    console.error("[GET /api/inventory] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
