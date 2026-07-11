// POST /api/dabia/trends
// Hybrid trend engine: early demand detection + diversity guard + recency boost
// GOVERNANCE rules enforced server-side. Ads excluded structurally.

import { NextRequest, NextResponse } from "next/server"
import { GOVERNANCE, computeSmartScore, applyDiversityGuard } from "@/lib/dabia/governance"
import { PRODUCTS, TRANSACTIONS } from "@/lib/dabia/store"
import type { Product, TrendEngineResponse } from "@/lib/dabia/types"

// ─── Category repetition guard — enforce content diversity ───────────────────
// Prevents the same category from occupying more than N consecutive slots
function applyCategoryDiversityGuard(products: Product[], maxConsecutive = 2): Product[] {
  const result: Product[] = []
  const deferred: Product[] = []
  let lastCategory = ""
  let consecutiveCount = 0

  for (const p of products) {
    if (p.category === lastCategory) {
      consecutiveCount++
      if (consecutiveCount >= maxConsecutive) {
        deferred.push(p)
        continue
      }
    } else {
      lastCategory = p.category
      consecutiveCount = 1
    }
    result.push(p)
  }

  // Re-insert deferred items in their score order after the initial pass
  return [...result, ...deferred]
}

// ─── Early demand signal boost ────────────────────────────────────────────────
// Products with earlyDemandSignals >= EARLY_DEMAND_MIN_SIGNALS get a recency boost
// based on confirmed transaction recency within the TREND_WINDOW_HOURS window.
function computeEarlyDemandBoost(product: Product): number {
  if (product.earlyDemandSignals < GOVERNANCE.EARLY_DEMAND_MIN_SIGNALS) return 0
  const windowMs = GOVERNANCE.TREND_WINDOW_HOURS * 3600 * 1000
  const now = Date.now()
  const recentTx = TRANSACTIONS.filter(tx =>
    tx.seller === product.seller &&
    tx.status === "confirmed" &&
    now - new Date(tx.timestamp).getTime() < windowMs
  )
  // Signal strength: 0–5 bonus points proportional to recent confirmed TXs
  return Math.min(recentTx.length * 1.5, 5)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category") ?? "All"
  const sortKey  = (searchParams.get("sort") ?? "smart") as "smart" | "price" | "rating" | "distance"
  const limit    = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50)

  // Step 1: filter — exclude ALL sponsored products structurally
  let pool = PRODUCTS.filter(p => !p.isSponsored)

  // Step 2: category filter
  if (category !== "All") {
    pool = pool.filter(p => p.category === category)
  }

  // Step 3: enforce trust floor from GOVERNANCE
  pool = pool.filter(p => p.sellerTrust >= GOVERNANCE.MIN_TRUST_SCORE_LIST)

  // Step 4: sort by requested key
  switch (sortKey) {
    case "smart":
      pool = pool
        .map(p => ({ ...p, _boostedScore: computeSmartScore(p) + computeEarlyDemandBoost(p) }))
        .sort((a, b) => (b as any)._boostedScore - (a as any)._boostedScore)
        .map(({ _boostedScore: _, ...p }) => p as Product)
      break
    case "price":
      pool = pool.sort((a, b) => a.price - b.price)
      break
    case "rating":
      pool = pool.sort((a, b) => b.rating - a.rating)
      break
    case "distance":
      pool = pool.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance))
      break
  }

  // Step 5: enforce seller diversity (max DIVERSITY_MAX_PER_SELLER per seller in top-N)
  const diversePool = applyDiversityGuard(pool)

  // Step 6: enforce category diversity (no more than 2 consecutive same category)
  const diverseFinal = applyCategoryDiversityGuard(diversePool)

  const ranked = diverseFinal.slice(0, limit)

  const response: TrendEngineResponse = {
    ranked,
    computedAt:        new Date().toISOString(),
    diversityEnforced: true,
    totalEvaluated:    pool.length,
    sponsoredSeparate: true,   // structural guarantee
  }

  return NextResponse.json(response, {
    headers: {
      "Cache-Control":                "no-store",
      "X-Governance-Ad-Weight":       String(GOVERNANCE.RANKING_AD_WEIGHT),
      "X-Governance-Diversity-Cap":   String(GOVERNANCE.DIVERSITY_MAX_PER_SELLER),
      "X-Governance-Trust-Floor":     String(GOVERNANCE.MIN_TRUST_SCORE_LIST),
    },
  })
}

export async function POST(req: NextRequest) {
  // Allow body-based filtering for complex queries
  const body = await req.json().catch(() => ({}))
  const url = new URL(req.url)
  const syntheticReq = new NextRequest(
    `${url.origin}/api/dabia/trends?category=${body.category ?? "All"}&sort=${body.sort ?? "smart"}&limit=${body.limit ?? 20}`,
    { method: "GET" }
  )
  return GET(syntheticReq)
}
