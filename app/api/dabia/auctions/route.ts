// GET  /api/dabia/auctions   — list live auctions
// POST /api/dabia/auctions   — place a bid (validated, blockchain-linked)

import { NextRequest, NextResponse } from "next/server"
import { GOVERNANCE } from "@/lib/dabia/governance"
import { AUCTIONS } from "@/lib/dabia/store"
import type { AuctionResponse } from "@/lib/dabia/types"

// In-memory bid store (in production: database with blockchain write)
const bids: Record<string, { bidder: string; amount: number; timestamp: string }[]> = {}

export async function GET() {
  const now = Date.now()
  const auctions = AUCTIONS.map(a => ({
    ...a,
    status: new Date(a.endsAt).getTime() < now ? ("ended" as const) : a.status,
  }))
  const response: AuctionResponse = { auctions }
  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !body.auctionId || !body.bidderId || typeof body.amount !== "number") {
    return NextResponse.json({ error: "Invalid bid payload" }, { status: 400 })
  }

  const auction = AUCTIONS.find(a => a.id === body.auctionId)
  if (!auction) {
    return NextResponse.json({ error: "Auction not found" }, { status: 404 })
  }
  if (auction.status !== "live") {
    return NextResponse.json({ error: "Auction is not live" }, { status: 409 })
  }
  if (body.amount < auction.currentBid + auction.minIncrement) {
    return NextResponse.json({
      error: `Bid must be at least ${auction.currentBid + auction.minIncrement}π`,
    }, { status: 422 })
  }

  // Security: high-value bids require multi-step verification flag
  const requiresVerification = body.amount >= GOVERNANCE.HIGH_VALUE_TX_THRESHOLD

  // Record bid
  if (!bids[body.auctionId]) bids[body.auctionId] = []
  bids[body.auctionId].push({
    bidder:    body.bidderId,
    amount:    body.amount,
    timestamp: new Date().toISOString(),
  })

  // Update auction in-memory (in production: DB write + blockchain event)
  auction.currentBid = body.amount
  auction.topBidder  = body.bidderId
  auction.bidCount   = (bids[body.auctionId] ?? []).length

  return NextResponse.json({
    success:              true,
    auctionId:            body.auctionId,
    newBid:               body.amount,
    requiresMFAVerify:    requiresVerification,
    verificationThreshold: GOVERNANCE.HIGH_VALUE_TX_THRESHOLD,
    txPending:            `TX-BID-${Date.now()}`,
  })
}
