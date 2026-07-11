// GET /api/dabia/trust?productId=1
// Computes the unified trust index combining verified sales, confirmed reviews,
// seller reliability, and activity. All inputs from confirmed on-chain data only.

import { NextRequest, NextResponse } from "next/server"
import { GOVERNANCE, computeTrustIndex } from "@/lib/dabia/governance"
import { PRODUCTS, TRANSACTIONS } from "@/lib/dabia/store"
import type { TrustIndex, TrustIndexResponse } from "@/lib/dabia/types"

export async function GET(req: NextRequest) {
  const productId = parseInt(new URL(req.url).searchParams.get("productId") ?? "0")

  const product = PRODUCTS.find(p => p.id === productId)
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 })
  }

  // Count only purchase-verified reviews (cross-validate against confirmed TX)
  const confirmedTxIds = new Set(
    TRANSACTIONS.filter(tx => tx.status === "confirmed").map(tx => tx.txId)
  )
  const confirmedReviewCount = product.reviews.filter(r =>
    r.verified && confirmedTxIds.has(r.purchaseTxId)
  ).length

  // Confirmed sales count — from transaction ledger, not self-reported
  const verifiedSalesCount = TRANSACTIONS.filter(tx =>
    tx.seller === product.seller && tx.status === "confirmed"
  ).length

  // Hours since last confirmed activity
  const sellerTx = TRANSACTIONS
    .filter(tx => tx.seller === product.seller && tx.status === "confirmed")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const lastActivityHoursAgo = sellerTx.length > 0
    ? (Date.now() - new Date(sellerTx[0].timestamp).getTime()) / 3600000
    : 999

  const totalScore = computeTrustIndex({
    verifiedSalesCount,
    confirmedReviewCount,
    sellerUptimePct:       product.sellerTrust,    // seller uptime proxy
    lastActivityHoursAgo,
  })

  const breakdown = {
    sales:       Math.min(verifiedSalesCount / 10000, 1) * 100 * GOVERNANCE.TRUST_INDEX_WEIGHTS.sales,
    reviews:     Math.min(confirmedReviewCount / 1000, 1) * 100 * GOVERNANCE.TRUST_INDEX_WEIGHTS.reviews,
    reliability: product.sellerTrust * GOVERNANCE.TRUST_INDEX_WEIGHTS.reliability,
    activity:    Math.max(0, 100 - lastActivityHoursAgo * 2) * GOVERNANCE.TRUST_INDEX_WEIGHTS.activity,
  }

  const trustIndex: TrustIndex = {
    productId,
    total: Math.round(totalScore * 10) / 10,
    breakdown,
    verifiedSalesCount,
    confirmedReviewCount,
    sellerUptimePct: product.sellerTrust,
    lastActivityHoursAgo: Math.round(lastActivityHoursAgo * 10) / 10,
    computedAt: new Date().toISOString(),
  }

  const response: TrustIndexResponse = { productId, trustIndex }

  return NextResponse.json(response, {
    headers: {
      "Cache-Control":             "no-store",
      "X-Trust-Weights-Sales":     String(GOVERNANCE.TRUST_INDEX_WEIGHTS.sales),
      "X-Trust-Weights-Reviews":   String(GOVERNANCE.TRUST_INDEX_WEIGHTS.reviews),
      "X-Governance-Review-Check": "purchase-linked-only",
    },
  })
}
