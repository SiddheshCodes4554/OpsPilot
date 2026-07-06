import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { EmailStatus, EmailPriority } from "@prisma/client"
import { z } from "zod"

const QuerySchema = z.object({
  status: z.enum(["SENT", "RECEIVED", "DRAFT", "FAILED", "ALL"]).default("ALL"),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.safeParse(Object.fromEntries(searchParams))

    if (!parsed.success) {
      return NextResponse.json(
        { status: "error", code: "VALIDATION_FAILED", errors: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const { status, search, page, limit } = parsed.data
    const skip = (page - 1) * limit

    // Build where clause
    const where: {
      status?: EmailStatus
      OR?: Array<Record<string, unknown>>
    } = {}

    if (status !== "ALL") {
      where.status = status as EmailStatus
    }

    if (search?.trim()) {
      where.OR = [
        { subject: { contains: search.trim(), mode: "insensitive" } },
        { recipient: { contains: search.trim(), mode: "insensitive" } },
        { sender: { contains: search.trim(), mode: "insensitive" } },
        { body: { contains: search.trim(), mode: "insensitive" } },
      ]
    }

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          subject: true,
          body: true,
          status: true,
          priority: true,
          sender: true,
          recipient: true,
          createdAt: true,
          updatedAt: true,
          customer: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.email.count({ where }),
    ])

    // Compute tab counts
    const [sentCount, receivedCount, draftCount, failedCount] = await Promise.all([
      prisma.email.count({ where: { status: "SENT" } }),
      prisma.email.count({ where: { status: "RECEIVED" } }),
      prisma.email.count({ where: { status: "DRAFT" } }),
      prisma.email.count({ where: { status: "FAILED" } }),
    ])

    return NextResponse.json({
      status: "success",
      data: {
        emails,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
        counts: {
          SENT: sentCount,
          RECEIVED: receivedCount,
          DRAFT: draftCount,
          FAILED: failedCount,
          ALL: sentCount + receivedCount + draftCount + failedCount,
        },
      },
    })
  } catch (error) {
    console.error("[GET /api/emails] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
