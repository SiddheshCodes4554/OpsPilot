import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { LogLevel } from "@prisma/client"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { agentId, action, level, message, metadata } = body as {
      agentId?: string
      action: string
      level?: LogLevel
      message: string
      metadata?: string
    }

    if (!action || !message) {
      return NextResponse.json(
        { status: "error", message: "Missing required fields: action or message." },
        { status: 400 }
      )
    }

    const agentLog = await prisma.agentLog.create({
      data: {
        agentId: agentId || null,
        action,
        level: level || "INFO",
        message,
        metadata: metadata || null,
      },
    })

    return NextResponse.json({ status: "success", data: agentLog }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/agent-log] Error:", error)
    return NextResponse.json(
      { status: "error", message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    )
  }
}
