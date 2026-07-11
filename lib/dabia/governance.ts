import type { Governance } from "./types"

// ─── GOVERNANCE — frozen at module init. No runtime mutation ever. ────────────
// All API routes import this object. Changing a rule requires a DAO vote
// and a new deployment — enforced by code review gates.
export const GOVERNANCE: Readonly<Governance> = Object.freeze({
  COMMISSION_RATE:            0.025,
  MAX_SPONSORED_PER_PAGE:     1,
  REVIEW_REQUIRES_PURCHASE:   true,
  MIN_TRUST_SCORE_LIST:       70,
  RANKING_AD_WEIGHT:          0,         // ads carry zero ranking weight — ever
  FRAUD_VELOCITY_MAX:         50,        // orders / IP / hour before auto-block
  AGENT_MIN_VERIFIED_RATE:    0.92,      // agents below this are flagged automatically
  DAO_QUORUM_PCT:             0.15,      // 15% of active users must vote for quorum
  DIVERSITY_MAX_PER_SELLER:   2,         // max products per seller in any top-N slice
  AUDIT_INTERVAL_HOURS:       6,         // immutable internal audit cadence
  PRICE_INFLATION_FLAG_PCT:   40,        // delta vs 30-day avg that triggers auto-flag
  MAX_AD_SLOTS_FEED:          1,         // hard cap on sponsored slots per page
  SELLER_BOND_PI:             50,        // π locked as seller bond
  DISPUTE_WINDOW_DAYS:        7,         // window for buyer dispute filing
  TREND_WINDOW_HOURS:         24,        // rolling window for demand detection
  EARLY_DEMAND_MIN_SIGNALS:   5,         // min signals before declaring early demand
  TRUST_INDEX_WEIGHTS: Object.freeze({
    sales:       0.40,   // confirmed on-chain sales (largest weight)
    reviews:     0.25,   // purchase-verified reviews only
    reliability: 0.20,   // seller uptime / dispute rate
    activity:    0.15,   // recency of activity
  }),
  AGENT_REWARD_PER_VERIFIED:  0.05,      // π per verified product
  AGENT_REWARD_PER_FRAUD:     0.25,      // π per caught fraud case
  HIGH_VALUE_TX_THRESHOLD:    500,       // π — triggers multi-step verification
  GROUP_SHOP_MIN:             3,         // min members to activate group price
  GROUP_SHOP_MAX:             20,        // max members per group session
})

// ─── Smart score formula — pure function, no side effects ────────────────────
// GOVERNANCE.RANKING_AD_WEIGHT is explicitly 0, sponsors are excluded upstream
export function computeSmartScore(p: {
  demandScore: number; salesSpeed: number; qualityScore: number
  trustScore: number; trendScore: number
}): number {
  return (
    p.demandScore  * 0.30 +
    p.salesSpeed   * 0.25 +
    p.qualityScore * 0.20 +
    p.trustScore   * 0.15 +
    p.trendScore   * 0.10
    // GOVERNANCE.RANKING_AD_WEIGHT === 0 — no term added
  )
}

// ─── Trust index formula — only confirmed data inputs ────────────────────────
export function computeTrustIndex(params: {
  verifiedSalesCount: number    // on-chain confirmed only
  confirmedReviewCount: number  // purchase-linked only
  sellerUptimePct: number       // 0-100
  lastActivityHoursAgo: number  // hours since last confirmed sale
}): number {
  const { sales, reviews, reliability, activity } = GOVERNANCE.TRUST_INDEX_WEIGHTS
  const salesNorm       = Math.min(params.verifiedSalesCount / 10000, 1) * 100
  const reviewNorm      = Math.min(params.confirmedReviewCount / 1000, 1) * 100
  const reliabilityNorm = params.sellerUptimePct
  const activityNorm    = Math.max(0, 100 - params.lastActivityHoursAgo * 2)
  return (
    salesNorm       * sales       +
    reviewNorm      * reviews     +
    reliabilityNorm * reliability +
    activityNorm    * activity
  )
}

// ─── Diversity guard — prevents seller monopoly in any ranked slice ───────────
export function applyDiversityGuard<T extends { seller: string; isSponsored: boolean }>(
  sorted: T[]
): T[] {
  // Sponsored items must NEVER enter this array — filter as safety net
  const nonSponsored = sorted.filter(p => !p.isSponsored)
  const counts: Record<string, number> = {}
  const result: T[] = [], deferred: T[] = []
  for (const p of nonSponsored) {
    const c = counts[p.seller] ?? 0
    if (c < GOVERNANCE.DIVERSITY_MAX_PER_SELLER) { counts[p.seller] = c + 1; result.push(p) }
    else deferred.push(p)
  }
  return [...result, ...deferred]
}

// ─── Agent permission level — derived from verifiedRate, not manually set ────
export function agentPermissionLevel(verifiedRate: number): 1 | 2 | 3 {
  if (verifiedRate >= 0.97) return 3
  if (verifiedRate >= GOVERNANCE.AGENT_MIN_VERIFIED_RATE) return 2
  return 1  // flagged / restricted
}

// ─── Agent reward — measurable, per confirmed result only ────────────────────
export function computeAgentReward(params: {
  verifiedProducts: number; caughtFrauds: number
}): number {
  return (
    params.verifiedProducts * GOVERNANCE.AGENT_REWARD_PER_VERIFIED +
    params.caughtFrauds     * GOVERNANCE.AGENT_REWARD_PER_FRAUD
  )
}
