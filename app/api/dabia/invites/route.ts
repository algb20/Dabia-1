// GET  /api/dabia/invites?sentBy=USR-0012  — list invitations with trace IDs
// POST /api/dabia/invites                  — send a new traceable invitation

import { NextRequest, NextResponse } from "next/server"
import { INVITES } from "@/lib/dabia/store"
import type { Invite, InviteMethod } from "@/lib/dabia/types"

function generateTraceId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  const rand4 = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  return `TRC-${Date.now().toString(36).toUpperCase()}-${rand4()}`
}

export async function GET(req: NextRequest) {
  const sentBy = new URL(req.url).searchParams.get("sentBy")
  const invites = sentBy
    ? INVITES.filter(i => i.sentBy === sentBy)
    : INVITES

  const stats = {
    total:            invites.length,
    accepted:         invites.filter(i => i.status === "accepted").length,
    pending:          invites.filter(i => i.status === "pending").length,
    declined:         invites.filter(i => i.status === "declined").length,
    premiumConverted: invites.filter(i => i.premiumConverted).length,
    conversionRate:   invites.length > 0
      ? Math.round((invites.filter(i => i.premiumConverted).length / invites.filter(i => i.status === "accepted").length || 0) * 100)
      : 0,
  }

  return NextResponse.json({ invites, stats }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.target || !body?.sentBy || !body?.method) {
    return NextResponse.json({ error: "target, sentBy, and method required" }, { status: 400 })
  }

  const validMethods: InviteMethod[] = ["email", "pi_network", "referral"]
  if (!validMethods.includes(body.method)) {
    return NextResponse.json({ error: `method must be one of: ${validMethods.join(", ")}` }, { status: 400 })
  }

  const invite: Invite = {
    id:               `INV-${String(INVITES.length + 1).padStart(3, "0")}`,
    target:           body.target,
    sentAt:           new Date().toISOString().split("T")[0],
    method:           body.method as InviteMethod,
    status:           "pending",
    sentBy:           body.sentBy,
    premiumConverted: false,
    traceId:          generateTraceId(),
  }

  INVITES.push(invite)

  return NextResponse.json({ success: true, invite }, { status: 201 })
}

// PATCH /api/dabia/invites — update status (accept/decline) — called when company responds
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.id || !body?.status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 })
  }
  const invite = INVITES.find(i => i.id === body.id)
  if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 })

  invite.status = body.status
  if (body.premiumConverted !== undefined) invite.premiumConverted = body.premiumConverted

  return NextResponse.json({ success: true, invite })
}
