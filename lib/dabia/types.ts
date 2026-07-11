// ─── Dabia shared types — single source of truth ───────────────────────────

export type TxStatus     = "confirmed" | "pending" | "failed"
export type AgentRole    = "scanner" | "verifier" | "price_monitor" | "fraud_detector"
export type AgentStatus  = "active" | "idle" | "flagged"
export type FraudType    = "velocity" | "fake_review" | "price_inflation" | "sybil" | "refund_abuse"
export type Severity     = "low" | "medium" | "high"
export type NotifType    = "price_drop" | "new_arrival" | "trending" | "vote" | "agent" | "fraud_alert" | "governance" | "order" | "group_invite" | "auction" | "crowdfund"
export type InviteStatus = "pending" | "accepted" | "declined"
export type InviteMethod = "email" | "pi_network" | "referral"
export type AuditResult  = "passed" | "warning" | "failed"
export type SubTier      = "free" | "pro" | "enterprise"
export type AuctionStatus    = "live" | "ended" | "scheduled"
export type CrowdfundStatus  = "active" | "funded" | "failed"

export interface Governance {
  COMMISSION_RATE:            number
  MAX_SPONSORED_PER_PAGE:     number
  REVIEW_REQUIRES_PURCHASE:   boolean
  MIN_TRUST_SCORE_LIST:       number
  RANKING_AD_WEIGHT:          number
  FRAUD_VELOCITY_MAX:         number
  AGENT_MIN_VERIFIED_RATE:    number
  DAO_QUORUM_PCT:             number
  DIVERSITY_MAX_PER_SELLER:   number
  AUDIT_INTERVAL_HOURS:       number
  PRICE_INFLATION_FLAG_PCT:   number
  MAX_AD_SLOTS_FEED:          number
  SELLER_BOND_PI:             number
  DISPUTE_WINDOW_DAYS:        number
  TREND_WINDOW_HOURS:         number
  EARLY_DEMAND_MIN_SIGNALS:   number
  TRUST_INDEX_WEIGHTS:        { sales: number; reviews: number; reliability: number; activity: number }
  AGENT_REWARD_PER_VERIFIED:  number
  AGENT_REWARD_PER_FRAUD:     number
  HIGH_VALUE_TX_THRESHOLD:    number
  GROUP_SHOP_MIN:             number
  GROUP_SHOP_MAX:             number
}

export interface Tx {
  txId: string; block: number; blockHash: string; timestamp: string
  buyer: string; seller: string; product: string; amount: number; status: TxStatus
}

export interface Review {
  id: number; author: string; rating: number; body: string
  purchaseTxId: string; verified: boolean; timestamp: string; helpful: number
}

export interface FraudFlag {
  type: FraudType; severity: Severity; description: string
  detectedAt: string; resolved: boolean
}

export interface Agent {
  id: string; role: AgentRole; status: AgentStatus
  processed: number; verifiedRate: number; fraudsCaught: number
  liveResults: number; lastActive: string
  rewardEarned: number       // π earned from confirmed results
  permissionLevel: 1 | 2 | 3 // tied to verifiedRate thresholds
}

export interface AgentRewardEvent {
  agentId: string; event: "verified_product" | "caught_fraud" | "price_update"
  rewardPi: number; timestamp: string; linkedTxId?: string
}

export interface Invite {
  id: string; target: string; sentAt: string; method: InviteMethod
  status: InviteStatus; sentBy: string; premiumConverted: boolean
  traceId: string   // unique traceable ID for audit
}

export interface AuditEntry {
  id: string; check: string; result: AuditResult; timestamp: string; detail: string
}

export interface TrustIndex {
  productId: number; total: number
  breakdown: { sales: number; reviews: number; reliability: number; activity: number }
  verifiedSalesCount: number; confirmedReviewCount: number
  sellerUptimePct: number; lastActivityHoursAgo: number
  computedAt: string
}

export interface Product {
  id: number; name: string; price: number; originalPrice?: number; currency: "π"
  image: string; rating: number; reviewCount: number; reviews: Review[]
  trend: "hot" | "up" | "new" | "stable" | "down"
  distance: string; verified: boolean; blockchainId: string; blockHash: string
  demandScore: number; salesSpeed: number; qualityScore: number
  trustScore: number; trendScore: number
  smartScore: number        // computed by engine, not stored
  trustIndex: TrustIndex
  category: string; seller: string; sellerTrust: number; sold: number
  liked: boolean; saved: boolean; badge?: "bestseller" | "premium" | "exclusive" | "rising"
  isSponsored: boolean; fraudFlags: FraudFlag[]
  location: { lat: number; lng: number; city: string }
  earlyDemandSignals: number   // signals in TREND_WINDOW_HOURS before first sale
  viewCount: number
}

export interface TransparencyStats {
  confirmedTx: number; volumePi: number; activeUsers: number; activeAgents: number
  verifiedProducts: number; fraudCaught: number; commission: number
  lastAudit: string; blockHeight: number; blockHash: string
  avgResponseMs: number; serverUptimePct: number
}

export interface DaoProposal {
  id: string; title: string; description: string
  votes: number; threshold: number; status: "active" | "passed" | "enacted" | "rejected"
  endsIn: string
}

export interface Notif {
  id: number; type: NotifType; title: string; body: string; time: string; read: boolean
}

export interface Auction {
  id: string; productName: string; image: string
  currentBid: number; minIncrement: number; currency: "π"
  endsAt: string; status: AuctionStatus
  bidCount: number; topBidder: string
  seller: string; blockchainId: string; verified: boolean
}

export interface CrowdfundCampaign {
  id: string; title: string; description: string; image: string
  goal: number; raised: number; currency: "π"
  backers: number; endsAt: string; status: CrowdfundStatus
  seller: string; blockchainId: string; verified: boolean
  category: string
}

export interface GroupShop {
  id: string; productId: number; productName: string; image: string
  originalPrice: number; groupPrice: number; currency: "π"
  membersJoined: number; membersNeeded: number
  endsAt: string; shareCode: string; status: "open" | "full" | "completed"
  createdBy: string
}

export interface Subscription {
  userId: string; tier: SubTier
  activatedAt: string; expiresAt: string
  features: string[]
  paidInPi: number; txId: string
}

export interface AIInsight {
  type: "market_trend" | "price_alert" | "demand_spike" | "competitor_move" | "recommendation"
  title: string; body: string; confidence: number
  generatedAt: string; relatedProductIds: number[]
  actionable: boolean
}

export interface SecurityChallenge {
  txId: string; stage: 1 | 2 | 3
  method: "biometric" | "otp" | "blockchain_sign"
  passed: boolean; timestamp: string
  requiredForAmount: number
}

// ─── API response wrappers ───────────────────────────────────────────────────

export interface TrendEngineResponse {
  ranked: Product[]; computedAt: string
  diversityEnforced: boolean; totalEvaluated: number
  sponsoredSeparate: boolean
}

export interface TrustIndexResponse {
  productId: number; trustIndex: TrustIndex
}

export interface AgentNetworkResponse {
  agents: Agent[]; rewardEvents: AgentRewardEvent[]
  totalRewardsPaid: number; avgVerifiedRate: number
}

export interface FraudResponse {
  flags: FraudFlag[]; openCount: number; resolvedCount: number
  velocityBlocked: number; reviewsRejected: number
}

export interface TransparencyResponse {
  stats: TransparencyStats; recentTx: Tx[]
  auditLog: AuditEntry[]
}

export interface AuctionResponse  { auctions: Auction[] }
export interface CrowdfundResponse { campaigns: CrowdfundCampaign[] }
export interface GroupShopResponse { groups: GroupShop[] }
export interface InsightsResponse  { insights: AIInsight[] }
export interface AlertsResponse    { notifications: Notif[] }
export interface SubscriptionResponse { subscription: Subscription | null }
