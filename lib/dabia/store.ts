// ─── Dabia in-memory data store (server-side, module-scoped singleton) ────────
// In production this would be a database. Every write here goes through
// the governance engine — no direct mutation of ranked lists.

import type {
  Tx, Product, Agent, AgentRewardEvent, Invite, AuditEntry,
  DaoProposal, Notif, FraudFlag, TransparencyStats,
  Auction, CrowdfundCampaign, GroupShop, Subscription, TrustIndex
} from "./types"
import { GOVERNANCE, computeSmartScore, computeTrustIndex, agentPermissionLevel, computeAgentReward } from "./governance"

// ─── TRANSACTIONS (immutable ledger — append only) ───────────────────────────
export const TRANSACTIONS: Tx[] = [
  { txId: "TX-A1B2C3", block: 4820112, blockHash: "0x7f3a9d1c4e8b2f0a", timestamp: "2026-03-22T08:12:00Z", buyer: "USR-4421", seller: "SoundCraft",    product: "Premium Wireless Headphones",     amount: 299,  status: "confirmed" },
  { txId: "TX-D4E5F6", block: 4820113, blockHash: "0x2b8e5f0a9c3d7e1b", timestamp: "2026-03-22T09:04:00Z", buyer: "USR-8813", seller: "TechLux",        product: "Smart Watch Pro Series 7",         amount: 450,  status: "confirmed" },
  { txId: "TX-G7H8I9", block: 4820113, blockHash: "0x9c1d4e7b3f5a2e8c", timestamp: "2026-03-22T10:30:00Z", buyer: "USR-2290", seller: "VisionStyle",     product: "Designer Aviator Sunglasses",      amount: 199,  status: "confirmed" },
  { txId: "TX-J0K1L2", block: 4820114, blockHash: "0x4f2a8c3d1b9e5f7a", timestamp: "2026-03-22T11:55:00Z", buyer: "USR-7701", seller: "LeatherCraft",    product: "Full-Grain Leather Messenger Bag", amount: 350,  status: "confirmed" },
  { txId: "TX-M3N4O5", block: 4820114, blockHash: "0x6e9b1f5c4a2d8e3b", timestamp: "2026-03-22T12:40:00Z", buyer: "USR-3345", seller: "SoundCraft",      product: "Noise Cancelling Earbuds Pro",     amount: 189,  status: "confirmed" },
  { txId: "TX-P6Q7R8", block: 4820115, blockHash: "0x3a7c9e2f5b1d4f8c", timestamp: "2026-03-22T13:15:00Z", buyer: "USR-6612", seller: "TimeCraft",       product: "Minimalist Mechanical Watch",      amount: 280,  status: "confirmed" },
  { txId: "TX-S1T2U3", block: 4820116, blockHash: "0x1c8f4a2e9b7d3c5f", timestamp: "2026-03-22T14:02:00Z", buyer: "USR-9901", seller: "LeatherCraft",    product: "Full-Grain Leather Messenger Bag", amount: 350,  status: "confirmed" },
  { txId: "TX-V4W5X6", block: 4820116, blockHash: "0x5d2b7e9f3a1c8e4d", timestamp: "2026-03-22T14:18:00Z", buyer: "USR-1155", seller: "VisionStyle",     product: "Designer Aviator Sunglasses",      amount: 199,  status: "confirmed" },
  { txId: "TX-HIGH01", block: 4820117, blockHash: "0xa3f1b8c9d2e7f4a1", timestamp: "2026-03-22T14:55:00Z", buyer: "USR-5500", seller: "TechLux",          product: "ProBook Ultra X1",                 amount: 1400, status: "confirmed" },
]

// ─── TRUST INDICES — computed from confirmed data only ───────────────────────
function buildTrustIndex(productId: number, salesCount: number, reviewCount: number, uptime: number, hoursAgo: number): TrustIndex {
  const breakdown = {
    sales:       Math.min(salesCount / 10000, 1) * 100 * GOVERNANCE.TRUST_INDEX_WEIGHTS.sales,
    reviews:     Math.min(reviewCount / 1000, 1) * 100 * GOVERNANCE.TRUST_INDEX_WEIGHTS.reviews,
    reliability: uptime * GOVERNANCE.TRUST_INDEX_WEIGHTS.reliability,
    activity:    Math.max(0, 100 - hoursAgo * 2) * GOVERNANCE.TRUST_INDEX_WEIGHTS.activity,
  }
  const total = breakdown.sales + breakdown.reviews + breakdown.reliability + breakdown.activity
  return {
    productId, total, breakdown,
    verifiedSalesCount: salesCount, confirmedReviewCount: reviewCount,
    sellerUptimePct: uptime, lastActivityHoursAgo: hoursAgo,
    computedAt: new Date().toISOString(),
  }
}

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
const _rawProducts: Omit<Product, "smartScore">[] = [
  {
    id: 1, name: "Premium Wireless Headphones", price: 299, originalPrice: 380, currency: "π",
    image: "/placeholder.svg?height=400&width=400", rating: 4.8, reviewCount: 2,
    reviews: [
      { id: 1, author: "USR-4421", rating: 5, body: "Exceptional sound quality. Worth every Pi.", purchaseTxId: "TX-A1B2C3", verified: true, timestamp: "2026-03-22", helpful: 42 },
      { id: 7, author: "USR-3345", rating: 5, body: "Best headphones on Pi Network. Confirmed purchase.", purchaseTxId: "TX-M3N4O5", verified: true, timestamp: "2026-03-22", helpful: 31 },
    ],
    trend: "hot", distance: "2.3 km", verified: true, blockchainId: "0xA1B2C3D4", blockHash: "0x7f3a9d1c4e8b2f0a",
    demandScore: 94, salesSpeed: 92, qualityScore: 96, trustScore: 98, trendScore: 89,
    trustIndex: buildTrustIndex(1, 8420, 1204, 99, 1),
    category: "Electronics", seller: "SoundCraft", sellerTrust: 97, sold: 8420,
    liked: false, saved: false, badge: "bestseller", isSponsored: false, fraudFlags: [],
    location: { lat: 24.688, lng: 46.722, city: "Riyadh" },
    earlyDemandSignals: 18, viewCount: 94200,
  },
  {
    id: 2, name: "Smart Watch Pro Series 7", price: 450, currency: "π",
    image: "/placeholder.svg?height=400&width=400", rating: 4.9, reviewCount: 1,
    reviews: [{ id: 2, author: "USR-8813", rating: 5, body: "Best smart watch on Pi. Fast delivery, verified.", purchaseTxId: "TX-D4E5F6", verified: true, timestamp: "2026-03-22", helpful: 81 }],
    trend: "hot", distance: "1.5 km", verified: true, blockchainId: "0xC3D4E5F6", blockHash: "0x2b8e5f0a9c3d7e1b",
    demandScore: 98, salesSpeed: 97, qualityScore: 95, trustScore: 99, trendScore: 96,
    trustIndex: buildTrustIndex(2, 12100, 980, 100, 0.5),
    category: "Electronics", seller: "TechLux", sellerTrust: 99, sold: 12100,
    liked: true, saved: true, badge: "premium", isSponsored: false, fraudFlags: [],
    location: { lat: 24.710, lng: 46.675, city: "Riyadh" },
    earlyDemandSignals: 31, viewCount: 128400,
  },
  {
    id: 3, name: "Designer Aviator Sunglasses", price: 199, originalPrice: 260, currency: "π",
    image: "/placeholder.svg?height=400&width=400", rating: 4.7, reviewCount: 2,
    reviews: [
      { id: 3, author: "USR-2290", rating: 4, body: "Great build quality. Premium packaging.", purchaseTxId: "TX-G7H8I9", verified: true, timestamp: "2026-03-22", helpful: 28 },
      { id: 8, author: "USR-1155", rating: 5, body: "Perfect gift. Confirmed on-chain purchase.", purchaseTxId: "TX-V4W5X6", verified: true, timestamp: "2026-03-22", helpful: 14 },
    ],
    trend: "up", distance: "3.1 km", verified: true, blockchainId: "0xE5F6G7H8", blockHash: "0x9c1d4e7b3f5a2e8c",
    demandScore: 82, salesSpeed: 79, qualityScore: 91, trustScore: 94, trendScore: 88,
    trustIndex: buildTrustIndex(3, 3200, 284, 97, 3),
    category: "Fashion", seller: "VisionStyle", sellerTrust: 95, sold: 3200,
    liked: false, saved: false, isSponsored: false, fraudFlags: [],
    location: { lat: 24.651, lng: 46.773, city: "Riyadh" },
    earlyDemandSignals: 9, viewCount: 31200,
  },
  {
    id: 4, name: "Full-Grain Leather Messenger Bag", price: 350, currency: "π",
    image: "/placeholder.svg?height=400&width=400", rating: 4.6, reviewCount: 2,
    reviews: [
      { id: 4, author: "USR-7701", rating: 5, body: "Premium craftsmanship. Confirmed on-chain.", purchaseTxId: "TX-J0K1L2", verified: true, timestamp: "2026-03-22", helpful: 19 },
      { id: 9, author: "USR-9901", rating: 4, body: "As described. Quality leather. Good packaging.", purchaseTxId: "TX-S1T2U3", verified: true, timestamp: "2026-03-22", helpful: 11 },
    ],
    trend: "new", distance: "4.2 km", verified: true, blockchainId: "0xG7H8I9J0", blockHash: "0x4f2a8c3d1b9e5f7a",
    demandScore: 76, salesSpeed: 71, qualityScore: 93, trustScore: 96, trendScore: 74,
    trustIndex: buildTrustIndex(4, 1820, 196, 98, 5),
    category: "Accessories", seller: "LeatherCraft", sellerTrust: 96, sold: 1820,
    liked: false, saved: false, badge: "exclusive", isSponsored: false, fraudFlags: [],
    location: { lat: 24.724, lng: 46.631, city: "Riyadh" },
    earlyDemandSignals: 6, viewCount: 18900,
  },
  {
    id: 5, name: "Noise Cancelling Earbuds Pro", price: 189, originalPrice: 230, currency: "π",
    image: "/placeholder.svg?height=400&width=400", rating: 4.7, reviewCount: 1,
    reviews: [{ id: 5, author: "USR-3345", rating: 5, body: "Near-perfect ANC. Verified via blockchain.", purchaseTxId: "TX-M3N4O5", verified: true, timestamp: "2026-03-22", helpful: 67 }],
    trend: "up", distance: "0.8 km", verified: true, blockchainId: "0xI9J0K1L2", blockHash: "0x6e9b1f5c4a2d8e3b",
    demandScore: 88, salesSpeed: 85, qualityScore: 90, trustScore: 97, trendScore: 87,
    trustIndex: buildTrustIndex(5, 9740, 840, 99, 2),
    category: "Electronics", seller: "SoundCraft", sellerTrust: 97, sold: 9740,
    liked: true, saved: false, badge: "rising", isSponsored: false, fraudFlags: [],
    location: { lat: 24.699, lng: 46.748, city: "Riyadh" },
    earlyDemandSignals: 14, viewCount: 62400,
  },
  {
    id: 6, name: "Minimalist Mechanical Watch", price: 280, currency: "π",
    image: "/placeholder.svg?height=400&width=400", rating: 4.8, reviewCount: 1,
    reviews: [{ id: 6, author: "USR-6612", rating: 5, body: "Beautiful movement. Silky smooth. Confirmed on-chain.", purchaseTxId: "TX-P6Q7R8", verified: true, timestamp: "2026-03-22", helpful: 34 }],
    trend: "up", distance: "5.0 km", verified: true, blockchainId: "0xK1L2M3N4", blockHash: "0x3a7c9e2f5b1d4f8c",
    demandScore: 80, salesSpeed: 77, qualityScore: 94, trustScore: 95, trendScore: 82,
    trustIndex: buildTrustIndex(6, 2150, 218, 97, 6),
    category: "Accessories", seller: "TimeCraft", sellerTrust: 94, sold: 2150,
    liked: false, saved: true, isSponsored: false, fraudFlags: [],
    location: { lat: 24.667, lng: 46.699, city: "Riyadh" },
    earlyDemandSignals: 7, viewCount: 24100,
  },
]

// Compute smartScore for each product
export const PRODUCTS: Product[] = _rawProducts.map(p => ({
  ...p,
  smartScore: computeSmartScore(p),
}))

// Sponsored slot — STRICTLY separated, never enters any ranked array
export const SPONSORED: Product = {
  id: 99, name: "TechLux UltraBook Air", price: 1200, currency: "π",
  image: "/placeholder.svg?height=400&width=400", rating: 4.5, reviewCount: 0, reviews: [],
  trend: "stable", distance: "1.2 km", verified: true, blockchainId: "0xSPON99", blockHash: "0x0000ad99",
  demandScore: 60, salesSpeed: 55, qualityScore: 88, trustScore: 92, trendScore: 60,
  smartScore: 0,  // excluded from ranking computation
  trustIndex: buildTrustIndex(99, 420, 38, 98, 4),
  category: "Electronics", seller: "TechLux", sellerTrust: 99, sold: 420,
  liked: false, saved: false, isSponsored: true, fraudFlags: [],
  location: { lat: 24.710, lng: 46.675, city: "Riyadh" },
  earlyDemandSignals: 0, viewCount: 4800,
}

// ─── AGENTS ───────────────────────────────────────────────────────────────────
export const AGENTS: Agent[] = [
  { id: "DAB-07", role: "scanner",        status: "active", processed: 28400, verifiedRate: 0.97, fraudsCaught: 14, liveResults: 2180, lastActive: "2 min",  rewardEarned: computeAgentReward({ verifiedProducts: 28400, caughtFrauds: 14 }),  permissionLevel: agentPermissionLevel(0.97) },
  { id: "DAB-09", role: "verifier",       status: "active", processed: 12400, verifiedRate: 0.99, fraudsCaught: 7,  liveResults: 1240, lastActive: "1 min",  rewardEarned: computeAgentReward({ verifiedProducts: 12400, caughtFrauds: 7  }),  permissionLevel: agentPermissionLevel(0.99) },
  { id: "DAB-12", role: "price_monitor",  status: "idle",   processed: 5600,  verifiedRate: 0.94, fraudsCaught: 2,  liveResults: 560,  lastActive: "18 min", rewardEarned: computeAgentReward({ verifiedProducts: 5600,  caughtFrauds: 2  }),  permissionLevel: agentPermissionLevel(0.94) },
  { id: "DAB-15", role: "fraud_detector", status: "active", processed: 8900,  verifiedRate: 0.98, fraudsCaught: 41, liveResults: 890,  lastActive: "30 sec", rewardEarned: computeAgentReward({ verifiedProducts: 8900,  caughtFrauds: 41 }),  permissionLevel: agentPermissionLevel(0.98) },
]

export const AGENT_REWARD_EVENTS: AgentRewardEvent[] = [
  { agentId: "DAB-09", event: "verified_product", rewardPi: 0.05, timestamp: "2026-03-22T14:01:00Z", linkedTxId: "TX-A1B2C3" },
  { agentId: "DAB-15", event: "caught_fraud",      rewardPi: 0.25, timestamp: "2026-03-22T11:30:00Z" },
  { agentId: "DAB-07", event: "verified_product",  rewardPi: 0.05, timestamp: "2026-03-22T13:58:00Z", linkedTxId: "TX-P6Q7R8" },
  { agentId: "DAB-12", event: "price_update",      rewardPi: 0.05, timestamp: "2026-03-22T12:00:00Z" },
  { agentId: "DAB-15", event: "caught_fraud",      rewardPi: 0.25, timestamp: "2026-03-21T18:00:00Z" },
]

// ─── INVITES ──────────────────────────────────────────────────────────────────
export const INVITES: Invite[] = [
  { id: "INV-001", target: "ApexWear Global",   sentAt: "2026-03-20", method: "email",      status: "accepted", sentBy: "AGENT-AUTO", premiumConverted: true,  traceId: "TRC-001-A1B2" },
  { id: "INV-002", target: "NovaTech Devices",  sentAt: "2026-03-21", method: "pi_network", status: "pending",  sentBy: "USR-0012",   premiumConverted: false, traceId: "TRC-002-C3D4" },
  { id: "INV-003", target: "LuxeHome Decor",    sentAt: "2026-03-19", method: "referral",   status: "accepted", sentBy: "USR-4421",   premiumConverted: true,  traceId: "TRC-003-E5F6" },
  { id: "INV-004", target: "SportFlow Inc",      sentAt: "2026-03-22", method: "email",      status: "pending",  sentBy: "AGENT-AUTO", premiumConverted: false, traceId: "TRC-004-G7H8" },
  { id: "INV-005", target: "GreenRoot Organics", sentAt: "2026-03-18", method: "referral",   status: "declined", sentBy: "USR-7701",   premiumConverted: false, traceId: "TRC-005-I9J0" },
]

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
export const AUDIT_LOG: AuditEntry[] = [
  { id: "A1", check: "Ranking algorithm integrity",     result: "passed",  timestamp: "2026-03-22 14:00 UTC", detail: "Ad weight confirmed 0. Diversity guard active. All 6 ranked products are non-sponsored." },
  { id: "A2", check: "Commission rate verification",    result: "passed",  timestamp: "2026-03-22 14:00 UTC", detail: "2.5% matches GOVERNANCE.COMMISSION_RATE. Smart contract enforced." },
  { id: "A3", check: "Ad–ranking separation",           result: "passed",  timestamp: "2026-03-22 14:00 UTC", detail: "SPONSORED array intersection with ranked list: 0 items." },
  { id: "A4", check: "Review purchase-link validation", result: "passed",  timestamp: "2026-03-22 14:00 UTC", detail: "9 reviews validated. All purchaseTxId values reference confirmed on-chain transactions." },
  { id: "A5", check: "Fraud flag sweep",                result: "passed",  timestamp: "2026-03-22 14:00 UTC", detail: "5 flags total. 4 resolved. 1 active (price inflation). No new escalations." },
  { id: "A6", check: "Agent performance assessment",    result: "passed",  timestamp: "2026-03-22 08:00 UTC", detail: "All 4 agents above 92% verified rate. DAB-12 at 94% — within threshold, monitoring." },
  { id: "A7", check: "Trust score floor enforcement",   result: "passed",  timestamp: "2026-03-22 08:00 UTC", detail: "0 sellers listed below trust floor 70. 3 sellers in probation queue." },
  { id: "A8", check: "Price inflation detection",       result: "warning", timestamp: "2026-03-22 08:00 UTC", detail: "1 listing at 42% delta vs 30-day average. Seller notified. Under review." },
]

// ─── DAO PROPOSALS ────────────────────────────────────────────────────────────
export const DAO_PROPOSALS: DaoProposal[] = [
  { id: "GP-2026-03", title: "Raise minimum seller trust score to 75", description: "Raise listing floor from 70→75 to improve catalog quality.", votes: 22140, threshold: Math.round(148320 * GOVERNANCE.DAO_QUORUM_PCT), status: "active",  endsIn: "4 days" },
  { id: "GP-2026-02", title: "Expand agent network to 8 agents",       description: "Add 4 agents: 2 scanners, 1 verifier, 1 fraud detector.",      votes: 28900, threshold: Math.round(148320 * GOVERNANCE.DAO_QUORUM_PCT), status: "passed",  endsIn: "Ended"  },
  { id: "GP-2026-01", title: "Lock commission rate at 2.5% for 12m",   description: "Lock 2.5% commission via smart contract for 12 months.",        votes: 31200, threshold: Math.round(148320 * GOVERNANCE.DAO_QUORUM_PCT), status: "enacted", endsIn: "Ended"  },
]

// ─── STATS ────────────────────────────────────────────────────────────────────
export const STATS: TransparencyStats = {
  confirmedTx:      284920,
  volumePi:         9_820_440,
  activeUsers:      148_320,
  activeAgents:     3,
  verifiedProducts: 12_840,
  fraudCaught:      64,
  commission:       GOVERNANCE.COMMISSION_RATE * 100,
  lastAudit:        "2026-03-22T14:00:00Z",
  blockHeight:      4_820_117,
  blockHash:        "0xa3f1b8c9d2e7f4a1",
  avgResponseMs:    84,
  serverUptimePct:  99.97,
}

// ─── AUCTIONS ─────────────────────────────────────────────────────────────────
export const AUCTIONS: Auction[] = [
  { id: "AUC-001", productName: "Limited Edition Gold Watch", image: "/placeholder.svg?height=300&width=300", currentBid: 820, minIncrement: 10, currency: "π", endsAt: new Date(Date.now() + 3 * 3600000).toISOString(), status: "live", bidCount: 14, topBidder: "USR-8813", seller: "TimeCraft", blockchainId: "0xAUC001", verified: true },
  { id: "AUC-002", productName: "Carbon Fiber Laptop Stand",  image: "/placeholder.svg?height=300&width=300", currentBid: 145, minIncrement: 5,  currency: "π", endsAt: new Date(Date.now() + 7 * 3600000).toISOString(), status: "live", bidCount: 6,  topBidder: "USR-4421", seller: "TechLux",   blockchainId: "0xAUC002", verified: true },
]

// ─── CROWDFUND ────────────────────────────────────────────────────────────────
export const CROWDFUND_CAMPAIGNS: CrowdfundCampaign[] = [
  { id: "CF-001", title: "Dabia Smart Speaker Gen 2", description: "Next-gen voice-controlled smart speaker built on Pi Network. Full blockchain provenance from component to delivery.", image: "/placeholder.svg?height=300&width=300", goal: 50000, raised: 34200, currency: "π", backers: 284, endsAt: new Date(Date.now() + 14 * 86400000).toISOString(), status: "active", seller: "SoundCraft", blockchainId: "0xCF001", verified: true, category: "Electronics" },
  { id: "CF-002", title: "Pi Artisan Leather Collection",  description: "Handcrafted luxury leather goods verified and funded directly on Pi Network.", image: "/placeholder.svg?height=300&width=300", goal: 20000, raised: 21400, currency: "π", backers: 168, endsAt: new Date(Date.now() + 5  * 86400000).toISOString(), status: "funded", seller: "LeatherCraft", blockchainId: "0xCF002", verified: true, category: "Fashion" },
]

// ─── GROUP SHOPPING ───────────────────────────────────────────────────────────
export const GROUP_SHOPS: GroupShop[] = [
  { id: "GRP-001", productId: 2, productName: "Smart Watch Pro Series 7", image: "/placeholder.svg?height=200&width=200", originalPrice: 450, groupPrice: 380, currency: "π", membersJoined: 4, membersNeeded: GOVERNANCE.GROUP_SHOP_MIN, endsAt: new Date(Date.now() + 6 * 3600000).toISOString(), shareCode: "DABIA-GRP-7X9K", status: "open",  createdBy: "USR-4421" },
  { id: "GRP-002", productId: 1, productName: "Premium Wireless Headphones", image: "/placeholder.svg?height=200&width=200", originalPrice: 299, groupPrice: 249, currency: "π", membersJoined: 3, membersNeeded: GOVERNANCE.GROUP_SHOP_MIN, endsAt: new Date(Date.now() + 2 * 3600000).toISOString(), shareCode: "DABIA-GRP-4M2P", status: "full", createdBy: "USR-8813" },
]

// ─── SUBSCRIPTIONS ────────────────────────────────────────────────────────────
export const SUBSCRIPTIONS: Subscription[] = [
  { userId: "USR-0012", tier: "pro",        activatedAt: "2026-03-01", expiresAt: "2026-04-01", features: ["AI assistant", "Advanced analytics", "Priority listing", "Bulk import", "Dedicated agent"], paidInPi: 49,  txId: "TX-SUB-PRO-001"  },
  { userId: "USR-4421", tier: "enterprise", activatedAt: "2026-02-15", expiresAt: "2026-05-15", features: ["All Pro features", "White-label", "Custom agent", "API access", "SLA support"],               paidInPi: 199, txId: "TX-SUB-ENT-001" },
]

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export const NOTIFICATIONS: Notif[] = [
  { id: 1, type: "price_drop",   title: "Price Drop Alert",   body: "Smart Watch Pro fell 15% — verified by on-chain price oracle.",              time: "2m",  read: false },
  { id: 2, type: "trending",     title: "Trending Now",        body: "Wireless Headphones is #1 in Electronics — 8,420 confirmed sales.",           time: "18m", read: false },
  { id: 3, type: "fraud_alert",  title: "Fraud Detected",      body: "Agent DAB-15 flagged 2 suspicious review patterns — under review.",           time: "45m", read: false },
  { id: 4, type: "governance",   title: "DAO Vote Open",        body: "GP-2026-03: Raise seller trust score to 75. Closes in 4 days.",              time: "2h",  read: false },
  { id: 5, type: "auction",      title: "Auction Ending Soon",  body: "Limited Edition Gold Watch auction ends in 3 hours. Current bid: 820π.",     time: "30m", read: false },
  { id: 6, type: "crowdfund",    title: "Campaign Funded",      body: "Pi Artisan Leather Collection hit 107% of goal — production confirmed.",      time: "1h",  read: false },
  { id: 7, type: "group_invite", title: "Group Shop Invite",    body: "USR-4421 invited you to group buy Smart Watch Pro at 380π (15% off).",       time: "5m",  read: false },
  { id: 8, type: "order",        title: "Order Confirmed",      body: "TX-A1B2C3 confirmed on block #4,820,112. Verified on-chain.",                time: "3h",  read: true  },
  { id: 9, type: "agent",        title: "Agent Report",         body: "Agent DAB-09 verified 348 products today — 99% authenticity rate.",          time: "1h",  read: true  },
]

export const FRAUD_FLAGS: FraudFlag[] = [
  { type: "velocity",        severity: "high",   description: "3 IPs blocked — exceeded 50 orders/hr threshold",        detectedAt: "2026-03-22T11:30:00Z", resolved: true  },
  { type: "fake_review",     severity: "medium", description: "12 reviews rejected — no matching confirmed purchase TX", detectedAt: "2026-03-22T10:15:00Z", resolved: true  },
  { type: "sybil",           severity: "high",   description: "2 sybil clusters identified and permanently banned",      detectedAt: "2026-03-21T18:00:00Z", resolved: true  },
  { type: "price_inflation", severity: "low",    description: "1 listing flagged: 42% price delta vs 30-day average",   detectedAt: "2026-03-22T09:40:00Z", resolved: false },
  { type: "refund_abuse",    severity: "medium", description: "1 buyer flagged for 4 refund requests in 7 days",        detectedAt: "2026-03-21T14:20:00Z", resolved: true  },
]
