// GET  /api/dabia/crowdfund   — list campaigns
// POST /api/dabia/crowdfund   — back a campaign with Pi

import { NextRequest, NextResponse } from "next/server"
import { CROWDFUND_CAMPAIGNS } from "@/lib/dabia/store"
import type { CrowdfundResponse } from "@/lib/dabia/types"

export async function GET() {
  const response: CrowdfundResponse = { campaigns: CROWDFUND_CAMPAIGNS }
  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  // Accept either userId or backerId for flexibility
  const backerId = body?.backerId ?? body?.userId
  if (!body?.campaignId || !backerId || typeof body?.amount !== "number") {
    return NextResponse.json({ error: "Invalid backing payload — requires campaignId, userId/backerId, amount" }, { status: 400 })
  }
  const campaign = CROWDFUND_CAMPAIGNS.find(c => c.id === body.campaignId)
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 })
  if (campaign.status !== "active") {
    return NextResponse.json({ error: "Campaign is not active" }, { status: 409 })
  }

  // Record backing (in production: DB write + Pi payment settlement)
  campaign.raised   = Math.min(campaign.raised + body.amount, campaign.goal * 1.5)
  campaign.backers += 1
  if (campaign.raised >= campaign.goal) campaign.status = "funded"

  return NextResponse.json({
    success:      true,
    campaignId:   body.campaignId,
    amountBacked: body.amount,
    newTotal:     campaign.raised,
    newBackers:   campaign.backers,
    status:       campaign.status,
    txPending:    `TX-CF-${Date.now()}`,
  })
}
