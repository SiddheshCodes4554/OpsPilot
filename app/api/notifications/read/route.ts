import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { id, all } = body as { id?: string; all?: boolean }

    if (all) {
      await prisma.notification.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      })
      return NextResponse.json({ status: "success", message: "All notifications marked as read." })
    }

    if (!id) {
      return NextResponse.json({ status: "error", message: "Missing notification id." }, { status: 400 })
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })

    return NextResponse.json({ status: "success", data: updatedNotification })
  } catch (error) {
    console.error("[PATCH /api/notifications/read] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
