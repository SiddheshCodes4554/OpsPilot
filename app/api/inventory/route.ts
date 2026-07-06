import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// ---------------------------------------------------------------------------
// GET - Retrieve all inventory items
// ---------------------------------------------------------------------------
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

    const serializedInventories = inventories.map((inv) => {
      const product = inv.product
      let reserved = 0
      let supplierName = "N/A"

      if (product) {
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

// ---------------------------------------------------------------------------
// POST - Create or fully update a product and its inventory record
// ---------------------------------------------------------------------------
const CreateInventorySchema = z.object({
  sku: z.string().min(1, "SKU is required").max(50),
  name: z.string().min(1, "Product name is required").max(100),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  location: z.string().optional().nullable(),
  minStockLevel: z.coerce.number().int().min(1, "Minimum stock level must be at least 1"),
  supplierId: z.string().optional().nullable(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = CreateInventorySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", code: "VALIDATION_FAILED", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const data = parsed.data

    // Check if product with this SKU already exists
    const existingProduct = await prisma.product.findUnique({
      where: { sku: data.sku },
      include: { inventory: true },
    })

    let product
    let inventory

    if (existingProduct) {
      // 1. Update existing product
      product = await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          supplierId: data.supplierId || null,
        },
      })

      // 2. Update or create inventory
      if (existingProduct.inventory) {
        inventory = await prisma.inventory.update({
          where: { id: existingProduct.inventory.id },
          data: {
            quantity: data.quantity,
            location: data.location || null,
            minStockLevel: data.minStockLevel,
          },
        })
      } else {
        inventory = await prisma.inventory.create({
          data: {
            productId: product.id,
            quantity: data.quantity,
            location: data.location || null,
            minStockLevel: data.minStockLevel,
          },
        })
      }
    } else {
      // 1. Create new product
      product = await prisma.product.create({
        data: {
          sku: data.sku,
          name: data.name,
          description: data.description,
          price: data.price,
          supplierId: data.supplierId || null,
        },
      })

      // 2. Create corresponding inventory record
      inventory = await prisma.inventory.create({
        data: {
          productId: product.id,
          quantity: data.quantity,
          location: data.location || null,
          minStockLevel: data.minStockLevel,
        },
      })
    }

    return NextResponse.json({
      status: "success",
      message: existingProduct ? "Inventory updated successfully" : "Product and inventory created successfully",
      data: {
        id: inventory.id,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productPrice: Number(product.price),
        quantity: inventory.quantity,
        location: inventory.location,
        minStockLevel: inventory.minStockLevel,
        supplierId: product.supplierId,
      },
    })
  } catch (error) {
    console.error("[POST /api/inventory] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
