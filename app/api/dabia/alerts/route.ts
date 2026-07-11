// GET  /api/dabia/alerts?userId=USR-0012   — get notifications
// POST /api/dabia/alerts/read              — mark as read

import { NextRequest, NextResponse } from "next/server"
import { NOTIFICATIONS } from "@/lib/dabia/store"
import type { AlertsResponse } from "@/lib/dabia/types"

export async function GET(req: NextRequest) {
  const userId = new URL(req.url).searchParams.get("userId")
  // In production: filter by userId from DB
  const notifications = NOTIFICATIONS.map(n => ({ ...n }))
  const unreadCount   = notifications.filter(n => !n.read).length

  const response: AlertsResponse & { unreadCount: number } = { notifications, unreadCount }
  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.notifId) return NextResponse.json({ error: "notifId required" }, { status: 400 })

  const notif = NOTIFICATIONS.find(n => n.id === body.notifId)
  if (notif) notif.read = true

  return NextResponse.json({ success: true, notifId: body.notifId })
}
