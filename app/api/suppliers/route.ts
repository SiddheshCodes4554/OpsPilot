import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

// ---------------------------------------------------------------------------
// GET - Retrieve all suppliers
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// POST - Create or Update a supplier
// ---------------------------------------------------------------------------
const SupplierSchema = z.object({
  id: z.string().optional().nullable(),
  name: z.string().min(1, "Name is required").max(100),
  contactName: z.string().optional().nullable(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().nullable(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = SupplierSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", code: "VALIDATION_FAILED", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const { id, name, contactName, email, phone } = parsed.data

    let supplier

    if (id) {
      // Update
      supplier = await prisma.supplier.update({
        where: { id },
        data: {
          name,
          contactName: contactName || null,
          email,
          phone: phone || null,
        },
      })
    } else {
      // Create
      supplier = await prisma.supplier.create({
        data: {
          name,
          contactName: contactName || null,
          email,
          phone: phone || null,
        },
      })
    }

    return NextResponse.json({
      status: "success",
      message: id ? "Supplier updated successfully" : "Supplier created successfully",
      data: supplier,
    })
  } catch (error) {
    console.error("[POST /api/suppliers] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE - Delete a supplier
// ---------------------------------------------------------------------------
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ status: "error", message: "Missing supplier ID." }, { status: 400 })
    }

    await prisma.supplier.delete({
      where: { id },
    })

    return NextResponse.json({
      status: "success",
      message: "Supplier deleted successfully",
    })
  } catch (error) {
    console.error("[DELETE /api/suppliers] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
