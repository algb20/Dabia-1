// GET  /api/dabia/group-shop          — list open group shopping sessions
// POST /api/dabia/group-shop          — create a new group session
// POST /api/dabia/group-shop/join     — join via invite code

import { NextRequest, NextResponse } from "next/server"
import { GOVERNANCE } from "@/lib/dabia/governance"
import { GROUP_SHOPS, PRODUCTS } from "@/lib/dabia/store"
import type { GroupShopResponse, GroupShop } from "@/lib/dabia/types"

export async function GET() {
  const now = Date.now()
  const groups = GROUP_SHOPS.map(g => ({
    ...g,
    status: new Date(g.endsAt).getTime() < now ? ("completed" as const)
           : g.membersJoined >= GOVERNANCE.GROUP_SHOP_MAX ? ("full" as const)
           : g.status,
  }))
  const response: GroupShopResponse = { groups }
  return NextResponse.json(response, {
    headers: {
      "Cache-Control":              "no-store",
      "X-Governance-Group-Min":     String(GOVERNANCE.GROUP_SHOP_MIN),
      "X-Governance-Group-Max":     String(GOVERNANCE.GROUP_SHOP_MAX),
    },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)

  // ── Join an existing group ────────────────────────────────────────────────
  if (body?.groupId && body?.userId) {
    const group = GROUP_SHOPS.find(g => g.id === body.groupId)
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 })
    if (group.status !== "open") return NextResponse.json({ error: "Group is not open" }, { status: 409 })
    group.membersJoined = Math.min(group.membersJoined + 1, GOVERNANCE.GROUP_SHOP_MAX)
    if (group.membersJoined >= GOVERNANCE.GROUP_SHOP_MAX) group.status = "full"
    return NextResponse.json({
      success: true, groupId: group.id,
      membersJoined: group.membersJoined, membersNeeded: group.membersNeeded,
      groupPrice: group.groupPrice, status: group.status,
    })
  }

  // ── Create a new group ────────────────────────────────────────────────────
  if (!body?.productId || !body?.createdBy) {
    // Support action:"create" shorthand from SpaceTab
    if (body?.action === "create" && body?.productId) {
      body.createdBy = body.userId ?? "USR-DEMO"
    } else {
      return NextResponse.json({ error: "productId and createdBy required" }, { status: 400 })
    }
  }

  const product = PRODUCTS.find(p => p.id === body.productId)
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

  const shareCode  = `DABIA-GRP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  const groupPrice = Math.round(product.price * 0.85)  // 15% group discount
  const endsAt     = new Date(Date.now() + 6 * 3600000).toISOString()

  const newGroup: GroupShop = {
    id:            `GRP-${Date.now()}`,
    productId:     product.id,
    productName:   product.name,
    image:         product.image,
    originalPrice: product.price,
    groupPrice,
    currency:      "π",
    membersJoined: 1,
    membersNeeded: GOVERNANCE.GROUP_SHOP_MIN,
    endsAt,
    shareCode,
    status:        "open",
    createdBy:     body.createdBy,
  }

  GROUP_SHOPS.push(newGroup)

  return NextResponse.json({
    success:    true,
    group:      newGroup,
    shareLink:  `https://dabia.pi/group/${shareCode}`,
    shareCode,
  })
}
