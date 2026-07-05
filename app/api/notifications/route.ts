import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId") || undefined

    const notifications = await prisma.notification.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ status: "success", data: notifications })
  } catch (error) {
    console.error("[GET /api/notifications] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, content, userId } = body as {
      title: string
      content: string
      userId?: string
    }

    if (!title || !content) {
      return NextResponse.json(
        { status: "error", message: "Missing required fields: title or content." },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        content,
        userId: userId || null,
      },
    })

    return NextResponse.json({ status: "success", data: notification }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/notifications] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
