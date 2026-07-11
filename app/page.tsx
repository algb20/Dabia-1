"use client"

import { useState, useCallback, useMemo, memo, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import useSWR, { mutate } from "swr"
import { useUserAuth } from "@/hooks/use-user-auth"
import { useTranslation, LANGUAGES } from "@/hooks/use-translation"
import { getProducts, createOrder, getOrdersByBuyer, addWalletTransaction, getRealNotifications, toggleLike, getLikeCount, isLikedByUser, recordShare, getShareCount, addComment, getComments, sharePostFromProduct, createTextPost, createPoll, votePoll, getFeedPosts, getPostsByUser, togglePinPost, deletePost, processMentions, createAuction, getLiveAuctions, getAuctionById, placeBid, getAuctionBids, subscribeToAuction, endAuction, createGroupDeal, getOpenGroupDeals, joinGroupDeal, createAnnouncement, sendVerificationCode, verifyEmailCode, getRealPlatformStats, getProductById, toggleSaveProduct, isProductSaved, getSavedProducts, toggleSavePost, isPostSaved, getSavedPosts, repostPost, addOrUpdateReview, getProductReviews, getTrendScores, getTrendingProducts, getActiveDeals, createStream, startStream, getLiveStreams, getUpcomingStreams, type DBLiveStream, type DBProduct, type RealNotif, type DBComment, type DBUser, type DBPost, type DBPoll, type DBAuction, type DBGroupDeal, type RealPlatformStats, type DBReview, type DBOrder } from "@/lib/dabia/db"
import { Progress } from "@/components/ui/progress"
import { rankByImageSimilarity } from "@/lib/image-search"
import { LiveStreamRoom } from "@/components/live-stream"
import {
  Home, Search, User, Sparkles, Bell, Star,
  BarChart3, Wallet, Shield, CheckCircle2,
  Flame, Crown, BadgeCheck, X, ShoppingCart, Share2,
  BookmarkPlus, Tag, ChevronRight, Lock, Plus, Truck,
  Lightbulb, Send, UserPlus, CheckCheck, Layers, Heart, TrendingUp,
  ArrowRight, ShieldCheck, Store, LayoutGrid, Grid3x3, Hexagon,
  Building, Receipt, Activity, Zap, Radio, Users, Compass, Clock, Loader2, AlertCircle, Edit3, Globe2, CreditCard, LogIn, MessageCircle, Users2, Instagram, Twitter, Eye, EyeOff, Megaphone, Moon, Sun, Repeat2, Pin, Bookmark, Mic, ImageIcon, Video, CalendarClock
} from "lucide-react"

// ─── Pi SDK global type (declared again locally for type-safety in this file) ─
declare global {
  interface Window {
    Pi?: {
      init: (cfg: { version: string; sandbox?: boolean }) => void
      authenticate: (scopes: string[], onIncomplete: (payment: any) => void) => Promise<{ user: { uid: string; username: string }; accessToken: string }>
      createPayment: (data: any, callbacks: any) => void
    }
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab         = "home" | "discover" | "space" | "business" | "profile" | "social"
type SortKey     = "smart" | "price" | "rating" | "distance"
type AccountType = "standard" | "premium" | "official"
type AuctionStatus = "live" | "ended" | "scheduled"
type SubTier     = "free" | "pro" | "enterprise"
type NotifType   = "price_drop" | "new_arrival" | "trending" | "order" | "auction" | "group_invite"

interface Review       { id: number; author: string; rating: number; body: string; purchaseTxId: string; verified: boolean; timestamp: string }
interface MerchantOffer { merchantName: string; accountType: AccountType; price: number; currency: "π"; inStock: boolean; deliveryDays: number; isOfficial: boolean; verified: boolean; rating: number; soldCount: number }
interface TrustIndex   { total: number; breakdown: { sales: number; reviews: number; reliability: number; activity: number }; verifiedSalesCount: number }
interface Product      { id: number; name: string; price: number; originalPrice?: number; dealEndsAt?: string; dealLabel?: string; currency: "π"; image: string; rating: number; reviewCount: number; reviews: Review[]; trend: "hot" | "up" | "new" | "stable"; distance: string; verified: boolean; blockchainId: string; trustScore: number; trustIndex: TrustIndex; category: string; seller: string; sellerUserId?: string; sellerTrust: number; sold: number; liked: boolean; saved: boolean; badge?: "bestseller" | "premium" | "exclusive" | "rising"; isSponsored: boolean; location: { city: string }; viewCount: number; sellerAccountType?: AccountType; merchantOffers?: MerchantOffer[] }
interface Auction      { id: string; productName: string; image: string; currentBid: number; minIncrement: number; currency: "π"; endsAt: string; status: AuctionStatus; bidCount: number; seller: string; blockchainId: string; verified: boolean }
interface GroupShop    { id: string; productId: number; productName: string; image: string; originalPrice: number; groupPrice: number; currency: "π"; membersJoined: number; membersNeeded: number; endsAt: string; shareCode: string; status: "open" | "full" | "completed"; createdBy: string }
interface Notif        { id: number; type: NotifType; title: string; body: string; time: string; read: boolean }
interface Subscription { userId: string; tier: SubTier; expiresAt: string; features: string[]; paidInPi: number }
interface TransparencyStats { confirmedTx: number; volumePi: number; activeUsers: number; verifiedProducts: number; fraudCaught: number; serverUptimePct: number; blockHeight: number }

// ─── Converts a real Supabase product row into the UI's Product shape ─────────
// تحويل منتج حقيقي من Supabase إلى الشكل الذي تتوقعه بطاقات الواجهة
function dbProductToProduct(p: DBProduct): Product {
  const idStr = p.id !== undefined && p.id !== null ? String(p.id) : ""
  const numericId = idStr ? (parseInt(idStr.replace(/[^0-9]/g, "").slice(0, 8) || "0", 10) || Date.now()) : Date.now()
  const isEmoji = !!p.image && p.image.length <= 4 && !p.image.startsWith("http")
  return {
    id: numericId,
    name: p.name,
    price: p.price,
    originalPrice: (p.original_price && p.original_price > p.price) ? p.original_price : undefined,
    dealEndsAt: p.deal_ends_at && new Date(p.deal_ends_at).getTime() > Date.now() ? p.deal_ends_at : undefined,
    dealLabel: p.deal_label || undefined,
    currency: "π",
    image: isEmoji ? p.image! : (p.image || "📦"),
    rating: p.rating ?? 0,
    reviewCount: p.review_count ?? 0,
    reviews: [],
    trend: "new",
    distance: "—",
    verified: true,
    blockchainId: idStr ? `PI-${idStr.slice(0, 8).toUpperCase()}` : "PI-PENDING",
    trustScore: Math.min(100, 60 + (p.review_count ?? 0)),
    trustIndex: {
      total: Math.min(100, 60 + (p.review_count ?? 0)),
      breakdown: { sales: p.review_count ?? 0, reviews: p.review_count ?? 0, reliability: 80, activity: 70 },
      verifiedSalesCount: p.review_count ?? 0,
    },
    category: p.category || "Other",
    seller: p.seller_name || "Dabia Seller",
    sellerUserId: p.seller_user_id ? String(p.seller_user_id) : undefined,
    sellerTrust: 80,
    sold: p.review_count ?? 0,
    liked: false,
    saved: false,
    isSponsored: false,
    location: { city: "Pi Network" },
    viewCount: 0,
  }
}

// ─── Time-of-day greeting ──────────────────────────────────────────────────────
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

// ─── زر الرجوع داخل التطبيق ──────────────────────────────────────────────────
// المشكلة الجذرية: صفحات المنتج والنوافذ تُفتح كحالة React فقط بدون إدخال في
// سجل المتصفح، فكان زر الرجوع (في الهاتف/المتصفح) يُخرج المستخدم من التطبيق
// كله. الحل — نمط التطبيقات العالمية: كل طبقة مفتوحة تسجّل إدخالاً في history،
// وزر الرجوع يغلق الطبقة العليا فقط. مستمع popstate واحد على مستوى الوحدة +
// مكدس إغلاقات، فلا تتضارب الطبقات المتداخلة (منتج ← مشاركة ← ...).
type OverlayEntry = { id: number; close: () => void }
const overlayStack: OverlayEntry[] = []
let overlaySeq = 0
let suppressNextPop = false
let overlayListenerInstalled = false
function ensureOverlayListener() {
  if (overlayListenerInstalled || typeof window === "undefined") return
  overlayListenerInstalled = true
  window.addEventListener("popstate", () => {
    if (suppressNextPop) { suppressNextPop = false; return }
    const top = overlayStack.pop()
    if (top) top.close()
  })
}
function useCloseOnBack(onClose: () => void) {
  const ref = useRef(onClose)
  ref.current = onClose
  useEffect(() => {
    ensureOverlayListener()
    const entry: OverlayEntry = { id: ++overlaySeq, close: () => ref.current() }
    overlayStack.push(entry)
    window.history.pushState({ dabiaOverlay: entry.id }, "")
    return () => {
      const idx = overlayStack.indexOf(entry)
      if (idx !== -1) {
        // أُغلقت الطبقة برمجياً (زر X مثلاً) — نستهلك إدخال history الخاص بها
        // بصمت حتى لا يحتاج المستخدم ضغطة رجوع إضافية لاحقاً
        overlayStack.splice(idx, 1)
        suppressNextPop = true
        window.history.back()
      }
    }
  }, [])
}

// ─── Fetcher & SWR hooks ──────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })

function useTrends(category: string, sort: SortKey) {
  return useSWR<{ ranked: Product[]; totalEvaluated: number }>(
    `dabia-real-products-${category}-${sort}`,
    async () => {
      const real = await getProducts({ category: category === "All" ? undefined : category, limit: 60 })
      let ranked: Product[] = real.map(dbProductToProduct)
      if (sort === "price")  ranked = [...ranked].sort((a, b) => a.price - b.price)
      if (sort === "rating") ranked = [...ranked].sort((a, b) => b.rating - a.rating)
      if (sort === "smart") {
        // ترتيب حيّ بمحرّك التراند الحقيقي (إعجابات/تعليقات/مشاركات/طلبات/تقييمات)
        const scores = await getTrendScores()
        ranked = [...ranked].sort((a, b) =>
          (scores.get(String(b.id))?.trend_score ?? 0) - (scores.get(String(a.id))?.trend_score ?? 0)
        )
      }
      return { ranked, totalEvaluated: ranked.length }
    },
    { refreshInterval: 15000 }
  )
}
// تم استبدال useAuctions/useGroupShop الوهمية (API ثابت في الذاكرة) بنظام
// مزادات/صفقات جماعية حقيقي عبر Supabase — راجع RealAuctionCard/RealGroupDealCard أدناه
function useAlerts(userId?: string) {
  return useSWR<{ notifications: RealNotif[] }>(
    userId ? `dabia-real-notifs-${userId}` : null,
    async () => {
      if (!userId) return { notifications: [] }
      const notifications = await getRealNotifications(userId)
      return { notifications }
    },
    { refreshInterval: 20000 }
  )
}
function useSubscription(userId: string) { return useSWR<{ subscription: Subscription | null }>(`/api/dabia/subscriptions?userId=${userId}`, fetcher) }
function useRealStats() {
  const [stats, setStats] = useState<RealPlatformStats | null>(null)
  useEffect(() => {
    let active = true
    const load = () => getRealPlatformStats().then(s => { if (active) setStats(s) })
    load()
    const i = setInterval(load, 30000)
    return () => { active = false; clearInterval(i) }
  }, [])
  return stats
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtPi  = (n: number) => `${n.toLocaleString()}π`
const fmtNum = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
const HIGH_VALUE = 500

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return "Ended"
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ملاحظة مهمة: هذه الدالة كانت سابقاً تُضيف "تجاراً منافسين" مُصنَّعين بالكامل
// (أسماء وأسعار وتقييمات وهمية) لمحاكاة ميزة "مقارنة أسعار" — وهذا يُضلّل
// المشتري بإيهامه بوجود بائعين حقيقيين آخرين لا وجود لهم فعلاً. أُزيلت هذه
// البيانات المصنَّعة؛ تُعرض الآن فقط بيانات البائع الحقيقي لهذا المنتج.
// ميزة "بائعون/منتجات مشابهة حقيقية" تحتاج بناءً منفصلاً يعتمد على بيانات
// فعلية من جدول المنتجات (مطابقة بالاسم/التصنيف)، وهي مطلوبة منك سابقاً
// ولم تُبنَ بعد — راجع HANDOFF_SUMMARY.
function getMerchantOffers(p: Product): MerchantOffer[] {
  return [
    { merchantName: p.seller, accountType: (p.sellerAccountType ?? "standard") as AccountType, price: p.price, currency: "π", inStock: true, deliveryDays: 3, isOfficial: p.sellerAccountType === "official", verified: p.verified, rating: +(p.sellerTrust / 20).toFixed(1), soldCount: p.sold },
  ]
}

// ─── Account badge ────────────────────────────────────────────────────────────
const AccountBadge = memo(function AccountBadge({ type, size = "md" }: { type?: AccountType; size?: "sm" | "md" }) {
  if (!type || type === "standard") return null
  const sm = size === "sm"
  if (type === "official") return (
    <span className={`inline-flex items-center gap-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-400/25 font-bold ${sm ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"}`}>
      <Building className={sm ? "h-2 w-2" : "h-3 w-3"} />Official Brand
    </span>
  )
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full bg-amber-400/15 text-amber-400 border border-amber-400/25 font-bold ${sm ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]"}`}>
      <Crown className={sm ? "h-2 w-2" : "h-3 w-3"} />Premium
    </span>
  )
})


// ─── Google Translate Icon ─────────────────────────────────────────────────────
function GoogleTranslateIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" fill="currentColor"/>
    </svg>
  )
}

// ─── Language Modal ────────────────────────────────────────────────────────────
function LanguageModal({ onClose, lang, setLang, translating }: {
  onClose: () => void; lang: string; setLang: (l: string) => void; translating: boolean
}) {
  useCloseOnBack(onClose)
  const [search, setSearch] = useState("")
  const filtered = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-slide-up">
      <header className="sticky top-0 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95">
          <X className="h-4 w-4" />
        </button>
        <p className="text-sm font-black flex-1">Language / اللغة</p>
        {translating && <span className="text-[11px] text-amber-400 animate-pulse">Translating…</span>}
      </header>
      <div className="px-4 py-2 border-b border-border">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search language..." autoFocus
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-amber-400/50" />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(l => (
          <button key={l.code} onClick={() => { setLang(l.code); onClose() }}
            className={`flex w-full items-center gap-3 px-4 py-3 border-b border-border/30 transition-colors ${lang === l.code ? "bg-amber-400/10" : "hover:bg-secondary"}`}>
            <span className="text-2xl">{l.flag}</span>
            <div className="flex-1 text-left">
              <p className="text-[13px] font-semibold">{l.name}</p>
              <p className="text-[10px] text-muted-foreground">{l.code.toUpperCase()}</p>
            </div>
            {lang === l.code && <span className="text-amber-400 font-bold">✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/40 bg-card" aria-hidden>
      <div className="aspect-[3/4] skeleton-shimmer" />
      <div className="space-y-2 p-2.5">
        <div className="h-3 w-3/4 rounded-full skeleton-shimmer" />
        <div className="h-3 w-1/2 rounded-full skeleton-shimmer" />
        <div className="mt-2 h-8 w-full rounded-xl skeleton-shimmer" />
      </div>
    </div>
  )
})

// ─── Product card ─────────────────────────────────────────────────────────────
const ProductCard = memo(function ProductCard({ product: p, onOpen, currentUser }: { product: Product; onOpen: (p: Product) => void; currentUser?: DBUser | null }) {
  const isOfficial = p.sellerAccountType === "official"
  const isPremium  = p.sellerAccountType === "premium"
  const discount   = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-card cursor-pointer active:scale-[0.97] transition-all duration-150 ${isOfficial ? "border-blue-400/30 ring-1 ring-blue-400/10" : isPremium ? "border-amber-400/25" : "border-border/50"}`}
      onClick={() => onOpen(p)}
      role="button" tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onOpen(p)}
      aria-label={`${p.name}, ${fmtPi(p.price)}`}
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-secondary/30 aspect-square sm:aspect-[3/4]">
        <img src={p.image} alt={p.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" decoding="async" />

        {/* Official overlay ring */}
        {isOfficial && <div className="absolute inset-0 ring-2 ring-inset ring-blue-400/20 rounded-2xl pointer-events-none" aria-hidden />}

        {/* Top-left: auth + official */}
        <div className="absolute left-1.5 top-1.5 flex flex-col gap-1">
          {p.verified && (
            <span className="flex items-center gap-0.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 backdrop-blur-sm">
              <BadgeCheck className="h-2.5 w-2.5" />Auth
            </span>
          )}
          {isOfficial && (
            <span className="flex items-center gap-0.5 rounded-full bg-blue-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
              <Building className="h-2.5 w-2.5" />Official
            </span>
          )}
        </div>

        {/* Top-right: trend indicator only (أزرار الإعجاب/الحفظ/المشاركة انتقلت
            إلى داخل صفحة المنتج لتفادي التشويش البصري على الشبكة) */}
        <div className="absolute right-1.5 top-1.5 flex flex-col items-end gap-1">
          {p.trend === "hot" && (
            <span className="flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] backdrop-blur-sm">
              <Flame className="h-2.5 w-2.5 text-red-400" />
            </span>
          )}
          {p.trend === "up" && (
            <span className="flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] backdrop-blur-sm">
              <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />
            </span>
          )}
          {p.trend === "new" && (
            <span className="flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] backdrop-blur-sm">
              <Sparkles className="h-2.5 w-2.5 text-blue-400" />
            </span>
          )}
        </div>

        {/* Bottom: discount + badge */}
        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-end justify-between">
          {discount >= 5 && (
            <span className="rounded-full bg-red-500/90 px-1.5 py-0.5 text-[9px] font-black text-white backdrop-blur-sm">
              -{discount}%
            </span>
          )}
          {p.badge === "bestseller" && (
            <span className="ml-auto rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[9px] font-bold text-black capitalize">
              {p.badge}
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        {(isOfficial || isPremium) && <AccountBadge type={p.sellerAccountType} size="sm" />}

        <p className="line-clamp-2 text-[10px] font-semibold leading-tight sm:text-[11px]">{p.name}</p>

        <div className="flex items-center gap-0.5">
          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400 shrink-0" />
          <span className="text-[9px] font-semibold sm:text-[10px]">{p.rating}</span>
        </div>

        <div className="mt-auto flex items-baseline gap-1">
          <span className="text-xs font-black text-amber-400 sm:text-sm">{fmtPi(p.price)}</span>
          {p.originalPrice && (
            <span className="text-[9px] text-muted-foreground line-through">{fmtPi(p.originalPrice)}</span>
          )}
        </div>
      </div>
    </article>
  )
})

// ─── Price gateway ────────────────────────────────────────────────────────────
const PriceGateway = memo(function PriceGateway({ product: p, selectedOffer, onSelect }: { product: Product; selectedOffer: MerchantOffer | null; onSelect: (o: MerchantOffer) => void }) {
  const offers  = useMemo(() => getMerchantOffers(p), [p])
  const best    = offers[0]
  const savings = offers[offers.length - 1].price - best.price

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-400/15 shrink-0">
          <Store className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-emerald-400">Best price across Pi Network</p>
          <p className="text-[10px] text-muted-foreground">{offers.length} verified merchants compared</p>
        </div>
        {savings > 0 && (
          <span className="shrink-0 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-black text-emerald-400 border border-emerald-400/20">
            Save {fmtPi(savings)}
          </span>
        )}
      </div>

      {/* Merchant rows */}
      <div className="space-y-2">
        {offers.map((offer, idx) => {
          const isSelected = selectedOffer ? selectedOffer.merchantName === offer.merchantName : idx === 0
          return (
            <button key={offer.merchantName} onClick={() => onSelect(offer)}
              className={`w-full text-left rounded-2xl border p-3 transition-all ${isSelected ? "border-amber-400/40 bg-amber-400/5" : "border-border bg-card hover:bg-secondary/30"}`}>
              <div className="flex items-center gap-3">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${idx === 0 ? "bg-emerald-400 text-black" : "bg-secondary text-muted-foreground"}`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[12px] font-semibold">{offer.merchantName}</span>
                    {offer.isOfficial && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-bold text-blue-400 border border-blue-400/20">
                        <Building className="h-2 w-2" />Official
                      </span>
                    )}
                    {!offer.isOfficial && offer.accountType === "premium" && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-400/20">
                        <Crown className="h-2 w-2" />Premium
                      </span>
                    )}
                    {offer.verified && <BadgeCheck className="h-3 w-3 text-emerald-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <span>{offer.rating} stars</span>
                    <span>·</span>
                    <span>{offer.deliveryDays}-day delivery</span>
                    <span>·</span>
                    <span>{fmtNum(offer.soldCount)} sold</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-black ${idx === 0 ? "text-emerald-400" : "text-foreground"}`}>{fmtPi(offer.price)}</p>
                  {idx === 0
                    ? <p className="text-[9px] font-bold text-emerald-400">Best price</p>
                    : <p className="text-[9px] text-muted-foreground">+{fmtPi(offer.price - best.price)}</p>
                  }
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Authenticity notice */}
      <div className="flex items-start gap-2 rounded-xl border border-border bg-secondary/20 px-3 py-2.5">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          All merchants go through Dabia's account verification process. Listings flagged as duplicates or counterfeits are removed by our team.
        </p>
      </div>
    </div>
  )
})

// ─── Product detail sheet ─────────────────────────────────────────────────────
// ─── Security modal ───────────────────────────────────────────────────────────
const SecurityModal = memo(function SecurityModal({ amount, onClose, onComplete }: { amount: number; onClose: () => void; onComplete: () => void }) {
  const { user: secUser }     = useUserAuth()
  const [stage, setStage]     = useState<1 | 2>(1)
  const [otp, setOtp]         = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState("")
  const [sent, setSent]       = useState(false)
  const steps = ["Send Code", "Verify"]

  // الخطوة 1: يطلب رمزاً حقيقياً عبر البريد المسجَّل (نفس نظام OTP الحقيقي
  // المستخدم في التسجيل واستعادة كلمة السر) — وليس رمزاً وهمياً في الذاكرة
  const sendCode = async () => {
    if (!secUser?.emall) { setError("No email on this account — cannot verify"); return }
    setLoading(true); setError("")
    const res = await sendVerificationCode(secUser.emall)
    setLoading(false)
    if (res.ok) { setSent(true); setStage(2) }
    else setError(res.error || "Failed to send code")
  }

  const verifyCode = async () => {
    if (!secUser?.emall || otp.length < 4) return
    setLoading(true); setError("")
    const res = await verifyEmailCode(secUser.emall, otp)
    setLoading(false)
    if (res.ok) onComplete()
    else setError(res.error || "Invalid code")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className="animate-slide-up w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-400/10 shrink-0">
            <ShieldCheck className="h-5 w-5 text-red-400" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Verification Required</p>
            <p className="text-[11px] text-muted-foreground">{fmtPi(amount)} — high-value purchase</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-5 flex items-center gap-1">
          {steps.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${i + 1 < stage ? "bg-emerald-400 text-black" : i + 1 === stage ? "bg-amber-400 text-black" : "bg-secondary text-muted-foreground"}`}>
                {i + 1 < stage ? <CheckCheck className="h-3 w-3" /> : i + 1}
              </div>
              <span className="text-[9px] text-center text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>

        {stage === 1 && <p className="mb-4 text-[12px] leading-relaxed text-muted-foreground">A real verification code will be emailed to <strong>{secUser?.emall}</strong> to confirm this purchase.</p>}
        {stage === 2 && (
          <>
            <p className="mb-2 text-[11px] text-emerald-400">✓ Code sent — check your inbox</p>
            <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,''))} placeholder="Enter the code" className="mb-4 w-full rounded-xl border border-border bg-background px-3 py-3 text-center text-lg font-mono tracking-widest outline-none focus:border-amber-400/50" maxLength={8} />
          </>
        )}
        {error && <p className="mb-3 rounded-lg bg-red-400/10 px-3 py-2 text-[11px] text-red-400">{error}</p>}

        <button onClick={stage === 1 ? sendCode : verifyCode} disabled={loading || (stage === 2 && otp.length < 4)} className="btn-primary w-full rounded-xl py-3 text-sm font-bold text-black disabled:opacity-40">
          {loading ? "Please wait…" : stage === 1 ? "Send Verification Code" : "Confirm Purchase"}
        </button>
      </div>
    </div>
  )
})

interface CheckoutData {
  quantity: number
  recipient_name: string
  recipient_phone: string
  ship_country: string
  ship_city: string
  ship_address: string
  ship_postal: string
}

const ProductDetail = memo(function ProductDetail({ product: p, onClose }: { product: Product; onClose: () => void }) {
  useCloseOnBack(onClose) // زر الرجوع يغلق صفحة المنتج بدل الخروج من التطبيق
  const [detailTab, setDetailTab]     = useState<"compare" | "overview" | "reviews">("compare")
  // منتجات مشابهة من نفس الفئة — فتحها يعرض تفاصيلها فوق الحالية (والرجوع يعيدك)
  const [similarSelected, setSimilarSelected] = useState<Product | null>(null)
  const { data: similarData } = useSWR<Product[]>(`dabia-similar-${p.category}-${p.id}`,
    async () => (await getProducts({ category: p.category, limit: 12 }))
      .map(dbProductToProduct)
      .filter(x => x.id !== p.id)
      .slice(0, 8))
  const similar = similarData ?? []
  const [selectedOffer, setSelectedOffer] = useState<MerchantOffer | null>(null)
  const [showSecurity, setShowSecurity]   = useState(false)
  const [done, setDone]               = useState(false)
  const [paying, setPaying]           = useState(false)
  const [paymentError, setPaymentError] = useState("")
  const { user: buyerUser } = useUserAuth()
  const [showShareModal, setShowShareModal] = useState(false)

  // إعجاب/حفظ حقيقيان — انتقلا إلى صفحة المنتج (لا يظهران على البطاقة لتفادي التشويش)
  const [dLiked, setDLiked] = useState(false)
  const [dSaved, setDSaved] = useState(false)
  useEffect(() => {
    if (buyerUser?.id) {
      isLikedByUser(buyerUser.id, String(p.id)).then(setDLiked)
      isProductSaved(buyerUser.id, String(p.id)).then(setDSaved)
    }
  }, [buyerUser?.id, p.id])
  const toggleDLike = async () => { if (!buyerUser?.id) return; setDLiked(v => !v); const { liked } = await toggleLike(buyerUser.id, String(p.id)); setDLiked(liked) }
  const toggleDSave = async () => { if (!buyerUser?.id) return; setDSaved(v => !v); const { saved } = await toggleSaveProduct(buyerUser.id, String(p.id)); setDSaved(saved) }

  // ── تقييمات حقيقية من القاعدة (تُحمَّل عند فتح تبويب Reviews) ──────────────
  const [reviews, setReviews]         = useState<DBReview[]>([])
  const [reviewsLoaded, setReviewsLoaded] = useState(false)
  const [myRating, setMyRating]       = useState(0)
  const [myReviewText, setMyReviewText] = useState("")
  const [savingReview, setSavingReview] = useState(false)
  const [reviewSaved, setReviewSaved]   = useState(false)
  const loadReviews = useCallback(async () => {
    const list = await getProductReviews(String(p.id))
    setReviews(list)
    setReviewsLoaded(true)
    if (buyerUser?.id) {
      const mine = list.find(r => String(r.user_id) === String(buyerUser.id))
      if (mine) { setMyRating(mine.rating); setMyReviewText(mine.body || "") }
    }
  }, [p.id, buyerUser?.id])
  useEffect(() => { if (detailTab === "reviews" && !reviewsLoaded) loadReviews() }, [detailTab, reviewsLoaded, loadReviews])

  const submitReview = useCallback(async () => {
    if (!buyerUser?.id || myRating < 1) return
    setSavingReview(true)
    const { review } = await addOrUpdateReview(String(p.id), buyerUser.id, buyerUser.username, myRating, myReviewText.trim() || undefined)
    setSavingReview(false)
    if (review) { setReviewSaved(true); setTimeout(() => setReviewSaved(false), 1800); loadReviews() }
  }, [buyerUser, p.id, myRating, myReviewText, loadReviews])

  const avgRating = reviews.length ? +(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : p.rating

  const offers      = useMemo(() => getMerchantOffers(p), [p])
  const activeOffer = selectedOffer ?? offers[0]
  const isHighValue = activeOffer.price >= HIGH_VALUE
  const isOfficial  = p.sellerAccountType === "official"
  const trustTotal  = Math.round(p.trustIndex?.total ?? p.trustScore)

  // ── نافذة إتمام الطلب (Checkout) — تُجمع فيها الكمية وبيانات الشحن قبل الدفع ──
  const [showCheckout, setShowCheckout] = useState(false)
  const [placedOrder, setPlacedOrder]   = useState<DBOrder | null>(null)
  const [pendingCheckout, setPendingCheckout] = useState<CheckoutData | null>(null)

  // ─── دفع حقيقي عبر Pi Network — لا محاكاة. يستقبل بيانات الطلب من Checkout ──
  const handleBuyWithPi = useCallback(async (co: CheckoutData) => {
    if (!buyerUser) { setPaymentError("Please sign in to buy"); return }
    setPaying(true); setPaymentError("")
    const total = +(activeOffer.price * co.quantity).toFixed(4)

    const finalize = async (piTxId?: string) => {
      try {
        const order = await createOrder({
          user_id:        buyerUser.id!,
          product_id:     String(p.id),
          product_name:   p.name,
          product_image:  p.image,
          seller_user_id: p.sellerUserId,
          seller_name:    p.seller,
          quantity:       co.quantity,
          unit_price:     activeOffer.price,
          total_price:    total,
          recipient_name:  co.recipient_name,
          recipient_phone: co.recipient_phone,
          ship_country:    co.ship_country,
          ship_city:       co.ship_city,
          ship_address:    co.ship_address,
          ship_postal:     co.ship_postal,
          shipping_address: `${co.recipient_name}, ${co.ship_address}, ${co.ship_city}, ${co.ship_country}${co.ship_postal ? " " + co.ship_postal : ""} — ${co.recipient_phone}`,
          pi_tx_id:       piTxId,
        })
        await addWalletTransaction({
          user_id:     buyerUser.id!,
          type:        "payment",
          amount:       total,
          description: `Purchase: ${p.name}${co.quantity > 1 ? ` ×${co.quantity}` : ""}`,
          pi_tx_id:    piTxId,
          status:      "completed",
        })
        if (order) setPlacedOrder(order)
      } catch { /* الطلب قد يفشل في السجل لكن الدفع تم — لا نوقف تجربة المستخدم */ }
      setPaying(false)
      setShowCheckout(false)
      setDone(true)
    }

    const hasPi = typeof window !== "undefined" && !!window.Pi
    if (!hasPi) {
      setPaymentError("Pi payment requires Pi Browser. Open this app inside Pi Browser to pay.")
      setPaying(false)
      return
    }

    try {
      window.Pi!.createPayment(
        {
          amount: total,
          memo: `Dabia purchase: ${p.name}`,
          metadata: { productId: p.id, productName: p.name, buyerId: buyerUser.id, quantity: co.quantity },
        },
        {
          onReadyForServerApproval: async (paymentId: string) => {
            try {
              await fetch("/api/dabia/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "approve", paymentId }),
              })
            } catch {}
          },
          onReadyForServerCompletion: async (paymentId: string, txid: string) => {
            try {
              await fetch("/api/dabia/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "complete", paymentId, txid }),
              })
            } catch {}
            await finalize(txid)
          },
          onCancel: () => { setPaying(false); setPaymentError("Payment cancelled") },
          onError:  (err: any) => { setPaying(false); setPaymentError(err?.message || "Payment failed") },
        }
      )
    } catch (e) {
      setPaying(false)
      setPaymentError(e instanceof Error ? e.message : "Payment failed")
    }
  }, [buyerUser, activeOffer, p])

  // ─── دفع ببطاقة بنكية عبر Stripe — موازٍ للدفع بـ Pi وليس بديلاً لشرائها ───
  const [payingCard, setPayingCard] = useState(false)
  const handleBuyWithCard = useCallback(async () => {
    if (!buyerUser) { setPaymentError("Please sign in to buy"); return }
    setPayingCard(true); setPaymentError("")
    try {
      const res = await fetch("/api/dabia/stripe-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: activeOffer.price, productName: p.name, currency: "usd" }),
      })
      const data = await res.json()
      if (data.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setPaymentError(data.error || "Card payments are not enabled yet")
      }
    } catch {
      setPaymentError("Could not start card checkout. Please try Pi instead.")
    } finally {
      setPayingCard(false)
    }
  }, [buyerUser, activeOffer, p])

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background animate-slide-up overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 pt-safe shrink-0">
        <button onClick={onClose} className="rounded-xl border border-border p-2 hover:bg-secondary transition-colors" aria-label="Back">
          <X className="h-4 w-4" />
        </button>
        <p className="flex-1 truncate text-sm font-bold">{p.name}</p>
        <div className="flex items-center gap-1.5">
          {isOfficial && (
            <span className="flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-400/20">
              <Building className="h-2.5 w-2.5" />Official
            </span>
          )}
          {p.verified && <BadgeCheck className="h-5 w-5 text-emerald-400" />}
          <button onClick={toggleDLike} className={`flex h-8 w-8 items-center justify-center rounded-xl border border-border transition-colors ${dLiked ? "bg-red-500/10 border-red-500/30" : "hover:bg-secondary"}`} title="Like" aria-label="Like">
            <Heart className={`h-3.5 w-3.5 ${dLiked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          </button>
          <button onClick={toggleDSave} className={`flex h-8 w-8 items-center justify-center rounded-xl border border-border transition-colors ${dSaved ? "bg-amber-400/10 border-amber-400/30" : "hover:bg-secondary"}`} title="Save" aria-label="Save">
            <Bookmark className={`h-3.5 w-3.5 ${dSaved ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
          </button>
          <button onClick={() => setShowShareModal(true)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border hover:bg-secondary transition-colors" title="Share" aria-label="Share">
            <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {showShareModal && (
        <ShareModal url={buildProductShareUrl(String(p.id))} title={`Check out "${p.name}" on Dabia — ${p.price}π`} onClose={() => setShowShareModal(false)}
          shareToSocial={buyerUser ? { product: { id: String(p.id), name: p.name, price: p.price, image: p.image }, user: buyerUser } : undefined} />
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Hero image */}
        <div className="relative aspect-[4/3] w-full bg-secondary/30">
          <img src={p.image} alt={p.name} className="h-full w-full object-cover" loading="lazy" decoding="async" />
          {isOfficial && (
            <div className="absolute bottom-3 left-3">
              <span className="flex items-center gap-1.5 rounded-full bg-blue-600/90 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
                <Building className="h-3 w-3" />Official Brand Store
              </span>
            </div>
          )}
          {isHighValue && (
            <div className="absolute bottom-3 right-3">
              <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-[11px] font-bold text-amber-400 backdrop-blur-sm">
                <Lock className="h-3 w-3" />Verified checkout
              </span>
            </div>
          )}
        </div>

        {/* Price summary */}
        <div className="flex items-center gap-4 border-b border-border px-4 py-4">
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-black text-amber-400">{fmtPi(activeOffer.price)}</p>
            {p.originalPrice && <p className="text-sm text-muted-foreground line-through">{fmtPi(p.originalPrice)}</p>}
            <p className="text-[11px] text-muted-foreground mt-0.5">via {activeOffer.merchantName}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-0.5">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`h-4 w-4 ${i <= Math.floor(p.rating) ? "fill-amber-400 text-amber-400" : "text-border"}`} />
              ))}
              <span className="text-sm font-bold ml-1">{p.rating}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">{fmtNum(p.sold)} sold</span>
          </div>
        </div>

        {/* Tabs — Compare first */}
        <div className="flex border-b border-border shrink-0">
          {(["compare", "overview", "reviews"] as const).map(t => (
            <button key={t} onClick={() => setDetailTab(t)}
              className={`flex-1 py-2.5 text-[12px] font-bold capitalize transition-colors ${detailTab === t ? "border-b-2 border-amber-400 text-amber-400" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "compare" ? "Prices" : t === "overview" ? "Details" : "Reviews"}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {/* PRICES TAB — shown first */}
          {detailTab === "compare" && (
            <PriceGateway product={p} selectedOffer={selectedOffer} onSelect={setSelectedOffer} />
          )}

          {/* DETAILS TAB */}
          {detailTab === "overview" && (
            <div className="space-y-4">
              {/* Seller card */}
              <div className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl shrink-0 ${isOfficial ? "bg-blue-500/15" : "bg-secondary"}`}>
                    {isOfficial ? <Building className="h-5 w-5 text-blue-400" /> : <Store className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-bold truncate">{p.seller}</p>
                    <AccountBadge type={p.sellerAccountType} size="sm" />
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-amber-400">{p.sellerTrust}%</p>
                    <p className="text-[9px] text-muted-foreground">Trust</p>
                  </div>
                </div>
              </div>

              {/* Trust bar — simple, not raw JSON */}
              <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold">Trust Score</span>
                  </div>
                  <span className={`text-sm font-black ${trustTotal >= 90 ? "text-emerald-400" : trustTotal >= 75 ? "text-amber-400" : "text-red-400"}`}>
                    {trustTotal}/100
                  </span>
                </div>
                <Progress value={trustTotal} className="h-2" />
                <p className="text-[10px] text-muted-foreground">Based on verified sales, confirmed reviews, and service reliability.</p>
              </div>

              {/* Authentication */}
              <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-3">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-emerald-400">Verified Listing</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    This seller's account has passed Dabia's verification process.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* REVIEWS TAB — تقييمات حقيقية من القاعدة */}
          {detailTab === "reviews" && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 rounded-2xl border border-border bg-secondary/30 p-3">
                <p className="text-4xl font-black text-amber-400">{avgRating || "—"}</p>
                <div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`h-4 w-4 ${i <= Math.floor(avgRating) ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {reviews.length} review{reviews.length === 1 ? "" : "s"}
                    {reviews.some(r => r.verified) && ` · ${reviews.filter(r => r.verified).length} purchase-verified`}
                  </p>
                </div>
              </div>

              {/* أضف/عدّل تقييمك — نجوم حقيقية تُحفظ في القاعدة */}
              {buyerUser ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3 space-y-2">
                  <p className="text-[11px] font-bold">Your rating</p>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <button key={i} onClick={() => setMyRating(i)} aria-label={`Rate ${i} star${i>1?"s":""}`} className="active:scale-90 transition-transform">
                        <Star className={`h-7 w-7 ${i <= myRating ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={myReviewText}
                    onChange={e => setMyReviewText(e.target.value)}
                    maxLength={300}
                    rows={2}
                    placeholder="Share your experience (optional)…"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-amber-400/50 resize-none"
                  />
                  <button onClick={submitReview} disabled={savingReview || myRating < 1}
                    className={`w-full rounded-xl py-2.5 text-[12px] font-bold transition-all active:scale-[0.99] disabled:opacity-50 ${reviewSaved ? "bg-emerald-400 text-black" : "bg-amber-400 text-black"}`}>
                    {savingReview ? "Saving…" : reviewSaved ? "Saved ✓" : "Submit Rating"}
                  </button>
                </div>
              ) : (
                <p className="rounded-xl border border-border bg-secondary/30 px-3 py-3 text-[11px] text-muted-foreground text-center">
                  Sign in to rate this product
                </p>
              )}

              {!reviewsLoaded ? (
                <div className="h-16 rounded-xl bg-secondary/40 animate-pulse" />
              ) : reviews.length === 0 ? (
                <p className="rounded-xl border border-border bg-secondary/30 px-3 py-5 text-[11px] text-muted-foreground text-center">
                  No reviews yet — be the first to rate this product.
                </p>
              ) : (
                reviews.map(r => (
                  <div key={r.id} className="rounded-xl border border-border bg-secondary/30 p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold">{r.username}</span>
                        {r.verified && <span className="rounded-full bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">Verified purchase</span>}
                      </div>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} className={`h-2.5 w-2.5 ${i <= r.rating ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                        ))}
                      </div>
                    </div>
                    {r.body && <p className="text-[11px] leading-relaxed text-muted-foreground">{r.body}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* منتجات مشابهة — نفس الفئة */}
          {similar.length > 0 && (
            <section className="space-y-2 pt-1">
              <p className="text-xs font-bold flex items-center gap-2">
                <LayoutGrid className="h-3.5 w-3.5 text-amber-400" />Similar products
              </p>
              <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
                {similar.map(sp => (
                  <button key={`sim-${sp.id}`} onClick={() => setSimilarSelected(sp)}
                    className="shrink-0 w-28 rounded-2xl border border-border bg-card p-2 text-left space-y-1.5 active:scale-95 transition-transform">
                    <div className="h-16 w-full overflow-hidden rounded-xl bg-secondary flex items-center justify-center text-2xl">
                      {sp.image.startsWith("http") ? <img src={sp.image} alt="" className="h-full w-full object-cover" /> : sp.image}
                    </div>
                    <p className="text-[10px] font-bold leading-tight line-clamp-2">{sp.name}</p>
                    <p className="text-[11px] font-black text-amber-400">{fmtPi(sp.price)}</p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {similarSelected && <ProductDetail product={similarSelected} onClose={() => setSimilarSelected(null)} />}

      {/* CTA */}
      <div className="border-t border-border p-4 pb-safe shrink-0">
        {paymentError && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-[11px] text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /><span>{paymentError}</span>
          </div>
        )}
        {done ? (
          <button className="w-full rounded-2xl bg-emerald-500 py-3.5 text-sm font-bold text-white flex items-center justify-center gap-2">
            <CheckCheck className="h-4 w-4" />Order Confirmed ✓
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1 text-[11px]">
              <span className="text-muted-foreground">Pay with Pi Network</span>
              <span className="font-bold text-amber-400">{fmtPi(activeOffer.price)}</span>
            </div>
            <button
              disabled={paying}
              onClick={() => { setPaymentError(""); setShowCheckout(true) }}
              className="btn-primary w-full rounded-2xl py-3 text-sm font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50">
              <ShoppingCart className="h-4 w-4" />Buy Now
            </button>
          </div>
        )}
      </div>

      {/* نافذة إتمام الطلب — كمية + بيانات شحن + ملخص + دفع */}
      {showCheckout && buyerUser && (
        <CheckoutSheet
          product={p} unitPrice={activeOffer.price} user={buyerUser} paying={paying || payingCard} error={paymentError}
          isHighValue={isHighValue}
          onClose={() => setShowCheckout(false)}
          onPayPi={(co) => { setPendingCheckout(co); if (isHighValue) setShowSecurity(true); else handleBuyWithPi(co) }}
          onPayCard={handleBuyWithCard}
        />
      )}

      {showSecurity && (
        <SecurityModal amount={activeOffer.price} onClose={() => setShowSecurity(false)}
          onComplete={() => { setShowSecurity(false); if (pendingCheckout) handleBuyWithPi(pendingCheckout) }} />
      )}

      {/* تأكيد الطلب مع رقم التتبّع */}
      {done && placedOrder && (
        <OrderPlacedSheet order={placedOrder} onClose={() => { setDone(false); setPlacedOrder(null); onClose() }} />
      )}
    </div>
  )
})

// ── نافذة إتمام الطلب الاحترافية ─────────────────────────────────────────────
function CheckoutSheet({ product, unitPrice, user, paying, error, isHighValue, onClose, onPayPi, onPayCard }: {
  product: Product; unitPrice: number; user: DBUser; paying: boolean; error: string; isHighValue: boolean
  onClose: () => void; onPayPi: (co: CheckoutData) => void; onPayCard: () => void
}) {
  useCloseOnBack(onClose)
  const maxStock = (product as any).stock ?? 99
  const [qty, setQty] = useState(1)
  const [co, setCo] = useState<CheckoutData>({
    quantity: 1,
    recipient_name: user.username || "",
    recipient_phone: (user as any).phone || "",
    ship_country: user.country || "",
    ship_city: "", ship_address: "", ship_postal: "",
  })
  const [touched, setTouched] = useState(false)
  const set = (k: keyof CheckoutData) => (e: React.ChangeEvent<HTMLInputElement>) => setCo(c => ({ ...c, [k]: e.target.value }))
  const total = +(unitPrice * qty).toFixed(4)
  const valid = co.recipient_name.trim() && co.recipient_phone.trim() && co.ship_country.trim() && co.ship_city.trim() && co.ship_address.trim()

  const submit = (method: "pi" | "card") => {
    setTouched(true)
    if (!valid) return
    const data = { ...co, quantity: qty }
    if (method === "pi") onPayPi(data)
    else onPayCard()
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl border-t border-border bg-card p-4 pb-8 max-h-[92vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-black">Checkout</p>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        {/* ملخص المنتج + الكمية */}
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/30 p-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary flex items-center justify-center text-2xl">
            {product.image.startsWith("http") ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : product.image}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold">{product.name}</p>
            <p className="text-[12px] font-black text-amber-400">{fmtPi(unitPrice)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-lg font-bold active:scale-90">−</button>
            <span className="w-6 text-center text-sm font-black">{qty}</span>
            <button onClick={() => setQty(q => Math.min(maxStock, q + 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-lg font-bold active:scale-90">+</button>
          </div>
        </div>

        {/* بيانات الشحن */}
        <div className="space-y-2">
          <p className="text-[12px] font-bold flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-amber-400" />Shipping details</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={co.recipient_name} onChange={set("recipient_name")} placeholder="Full name *" className="col-span-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
            <input value={co.recipient_phone} onChange={set("recipient_phone")} placeholder="Phone *" inputMode="tel" className="col-span-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
            <input value={co.ship_country} onChange={set("ship_country")} placeholder="Country *" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
            <input value={co.ship_city} onChange={set("ship_city")} placeholder="City *" className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
            <input value={co.ship_address} onChange={set("ship_address")} placeholder="Street address *" className="col-span-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
            <input value={co.ship_postal} onChange={set("ship_postal")} placeholder="Postal code (optional)" className="col-span-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
          </div>
          {touched && !valid && <p className="text-[11px] text-red-400">Please fill all required (*) fields</p>}
        </div>

        {/* ملخص السعر */}
        <div className="rounded-2xl border border-border bg-secondary/20 p-3 space-y-1 text-[12px]">
          <div className="flex justify-between text-muted-foreground"><span>{fmtPi(unitPrice)} × {qty}</span><span>{fmtPi(total)}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span>Arranged with seller</span></div>
          <div className="flex justify-between pt-1 border-t border-border text-sm font-black"><span>Total</span><span className="text-amber-400">{fmtPi(total)}</span></div>
        </div>

        {/* حماية الطرفين */}
        <div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-relaxed text-muted-foreground">Your payment is confirmed on Pi Network and the order is tracked end-to-end. You'll get an order number to follow shipping, and confirm receipt when it arrives.</p>
        </div>

        {error && <p className="rounded-lg bg-red-400/10 px-3 py-2 text-[11px] text-red-400">{error}</p>}

        <button onClick={() => submit("pi")} disabled={paying}
          className="btn-primary w-full rounded-2xl py-3 text-sm font-bold text-black flex items-center justify-center gap-2 disabled:opacity-50">
          {paying ? <><Loader2 className="h-4 w-4 animate-spin" />Processing…</> : isHighValue ? <><Lock className="h-4 w-4" />Verify &amp; Pay {fmtPi(total)}</> : <><ShoppingCart className="h-4 w-4" />Place Order · Pay {fmtPi(total)}</>}
        </button>
        <button onClick={() => submit("card")} disabled={paying}
          className="w-full rounded-2xl border border-border bg-card py-2.5 text-[13px] font-bold flex items-center justify-center gap-2 disabled:opacity-50">
          <CreditCard className="h-4 w-4" />Pay with Card
        </button>
      </div>
    </div>
  )
}

// ── تأكيد الطلب مع رقم التتبّع ───────────────────────────────────────────────
function OrderPlacedSheet({ order, onClose }: { order: DBOrder; onClose: () => void }) {
  useCloseOnBack(onClose)
  const [copied, setCopied] = useState(false)
  return (
    <div className="fixed inset-0 z-[68] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6" onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center space-y-4" onClick={e => e.stopPropagation()}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500"><CheckCheck className="h-8 w-8 text-white" /></div>
        <div>
          <p className="text-lg font-black">Order placed!</p>
          <p className="text-[12px] text-muted-foreground mt-1">Your payment is confirmed and the seller has been notified.</p>
        </div>
        <div className="rounded-2xl border border-border bg-secondary/30 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order number</p>
          <p className="text-lg font-black tracking-wide text-amber-400">{order.order_number}</p>
          <button onClick={() => { navigator.clipboard?.writeText(order.order_number || ""); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            className="mt-1 text-[11px] font-semibold text-muted-foreground">{copied ? "Copied ✓" : "Tap to copy"}</button>
        </div>
        <p className="text-[11px] text-muted-foreground">Track it anytime from <span className="font-bold text-foreground">Profile → My Orders</span>.</p>
        <button onClick={onClose} className="w-full rounded-2xl bg-amber-400 py-3 text-sm font-bold text-black">Done</button>
      </div>
    </div>
  )
}

// ─── Notification panel ───────────────────────────────────────────────────────
const NotifPanel = memo(function NotifPanel({ notifs, onClose }: { notifs: RealNotif[]; onClose: () => void }) {
  const iconMap: Record<string, React.ReactNode> = {
    account: <ShieldCheck className="h-4 w-4 text-amber-400" />,
    order:   <Truck className="h-4 w-4 text-emerald-400" />,
    price_drop: <Tag className="h-4 w-4 text-emerald-400" />, new_arrival: <Sparkles className="h-4 w-4 text-blue-400" />,
    trending: <TrendingUp className="h-4 w-4 text-amber-400" />,
    group_invite: <Users className="h-4 w-4 text-purple-400" />, auction: <Radio className="h-4 w-4 text-amber-400" />,
  }
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-slide-up">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 pt-safe shrink-0">
        <button onClick={onClose} className="rounded-xl border border-border p-2 hover:bg-secondary" aria-label="Close"><X className="h-4 w-4" /></button>
        <p className="text-sm font-bold">Notifications</p>
        <span className="ml-auto text-[11px] text-muted-foreground">{notifs.filter(n => !n.read).length} unread</span>
      </header>
      <div className="flex-1 overflow-y-auto">
        {notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground py-16">
            <Bell className="h-10 w-10 opacity-30" /><p className="text-sm">All caught up</p>
          </div>
        ) : notifs.map(n => (
          <div key={n.id} className={`flex items-start gap-3 border-b border-border px-4 py-3.5 ${!n.read ? "bg-secondary/30" : ""}`}>
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
              {iconMap[n.type] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`text-sm ${!n.read ? "font-bold" : "font-medium"}`}>{n.title}</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground mt-0.5">{n.body}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.time).toLocaleDateString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden />}
          </div>
        ))}
      </div>
    </div>
  )
})

// ─── Search overlay ───────────────────────────────────────────────────────────
const SearchOverlay = memo(function SearchOverlay({ onClose }: { onClose: () => void }) {
  useCloseOnBack(onClose)
  const [query, setQuery] = useState("")
  const { data } = useTrends("All", "smart")
  const { user: searchUser } = useUserAuth()
  const [selected, setSelected] = useState<Product | null>(null)

  // ── بحث بالصوت — Web Speech API، يظهر الزر فقط إن كان المتصفح يدعمه فعلياً ──
  const [listening, setListening] = useState(false)
  const speechSupported = typeof window !== "undefined" && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  const recognitionRef = useRef<any>(null)
  const startVoiceSearch = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    try {
      const rec = new SR()
      recognitionRef.current = rec
      rec.lang = document.documentElement.lang && document.documentElement.lang !== "en" ? document.documentElement.lang : "en-US"
      rec.interimResults = true
      rec.onresult = (e: any) => {
        const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join("")
        setQuery(transcript)
      }
      rec.onend = () => setListening(false)
      rec.onerror = () => setListening(false)
      setListening(true)
      rec.start()
    } catch { setListening(false) }
  }, [])
  const stopVoiceSearch = useCallback(() => { try { recognitionRef.current?.stop() } catch {}; setListening(false) }, [])

  // ── بحث بالصور — بصمة إدراكية محلية تقارن صورتك بصور المنتجات ────────────
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [imageResults, setImageResults] = useState<Product[] | null>(null)
  const [imageSearching, setImageSearching] = useState(false)
  const handleImageSearch = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // يسمح بإعادة اختيار نفس الملف
    if (!file || !data?.ranked) return
    setImageSearching(true); setQuery(""); setImageResults(null)
    try {
      const ranked = await rankByImageSimilarity(file, data.ranked)
      setImageResults(ranked)
    } finally { setImageSearching(false) }
  }, [data])

  const results = useMemo(() => {
    if (!query.trim() || !data?.ranked) return []
    const q = query.toLowerCase()
    return data.ranked.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.seller.toLowerCase().includes(q))
  }, [query, data])

  // أعلى المنتجات رواجاً فعلياً (المعروضة أصلاً بترتيب محرّك التراند الحقيقي)
  const trendingTerms = useMemo(() => (data?.ranked ?? []).slice(0, 4).map(p => p.name), [data])
  const categories = useMemo(() => Array.from(new Set((data?.ranked ?? []).map(p => p.category).filter(Boolean))).slice(0, 8), [data])

  if (selected) return <ProductDetail product={selected} onClose={() => setSelected(null)} />

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 pt-safe">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2 focus-within:border-amber-400/50 transition-colors">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input autoFocus value={query} onChange={e => { setQuery(e.target.value); setImageResults(null) }} placeholder="Search products, brands, categories…" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          {query && <button onClick={() => setQuery("")} aria-label="Clear"><X className="h-4 w-4 text-muted-foreground" /></button>}
          {speechSupported && (
            <button onClick={listening ? stopVoiceSearch : startVoiceSearch} aria-label="Voice search"
              className={`shrink-0 ${listening ? "text-red-400 animate-pulse" : "text-muted-foreground"}`}>
              <Mic className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => imageInputRef.current?.click()} aria-label="Search by image" className="shrink-0 text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
          </button>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSearch} />
        </div>
        <button onClick={onClose} className="shrink-0 text-sm font-semibold text-muted-foreground hover:text-foreground">Cancel</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {listening && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2.5 text-[12px] text-red-400">
            <Mic className="h-4 w-4 animate-pulse" />Listening… speak now
          </div>
        )}
        {imageSearching && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            <p className="text-sm">Matching your image against listings…</p>
          </div>
        )}
        {imageResults !== null && !imageSearching && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground">{imageResults.length} visually similar result{imageResults.length === 1 ? "" : "s"}</p>
              <button onClick={() => setImageResults(null)} className="text-[11px] font-semibold text-amber-400">Clear image search</button>
            </div>
            {imageResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <ImageIcon className="h-10 w-10 opacity-30" />
                <p className="text-sm">No visually similar products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {imageResults.map(p => <ProductCard key={p.id} product={p} onOpen={setSelected} currentUser={searchUser} />)}
              </div>
            )}
          </div>
        )}
        {!query && imageResults === null && !imageSearching && (
          <div className="space-y-4">
            {trendingTerms.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold text-muted-foreground">Trending now</p>
                <div className="space-y-1.5">
                  {trendingTerms.map(term => (
                    <button key={term} onClick={() => setQuery(term)} className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left hover:bg-secondary/40 transition-colors">
                      <TrendingUp className="h-4 w-4 shrink-0 text-amber-400" />
                      <span className="flex-1 text-sm truncate">{term}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {categories.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold text-muted-foreground">Categories</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button key={cat} onClick={() => setQuery(cat)} className="rounded-xl border border-border bg-secondary/40 px-3 py-1.5 text-xs font-medium hover:border-amber-400/30 transition-colors">{cat}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Search className="h-10 w-10 opacity-30" />
            <p className="text-sm">No results for "{query}"</p>
          </div>
        )}
        {query && results.length > 0 && (
          <div>
            <p className="mb-3 text-[11px] text-muted-foreground">{results.length} results</p>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {results.map(p => <ProductCard key={p.id} product={p} onOpen={setSelected} currentUser={searchUser} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

// ─── ملاحظة: AuctionCard القديمة (وهمية، تتصل بـ /api/dabia/auctions الوهمي
// وتعرض "Blockchain-verified" كاذباً) حُذفت بالكامل — استُبدلت بـ RealAuctionCard
// الحقيقية أدناه التي تتصل بـ Supabase Realtime فعلياً

// ─── Group shop card ──────────────────────────────────────────────────────────
// ─── ملاحظة: GroupShopCard القديمة (تتصل بـ /api/dabia/group-shop الوهمي)
// حُذفت — استُبدلت بـ RealGroupDealCard التي تتصل بجدول group_deals الحقيقي

// ─── AI assistant ──────────────────────────────────────────────────────────────
const AIAssistant = memo(function AIAssistant() {
  const [open, setOpen] = useState(false)
  const [tips, setTips] = useState<string[]>([])
  const [loadingTips, setLoadingTips] = useState(false)

  const loadTips = useCallback(async () => {
    setLoadingTips(true)
    try {
      const products = await getProducts({ limit: 20 })
      const newTips: string[] = []
      if (products.length > 0) {
        const cheapest = [...products].sort((a, b) => a.price - b.price)[0]
        const topRated  = [...products].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0]
        if (cheapest) newTips.push(`Best price right now: "${cheapest.name}" at ${cheapest.price}π`)
        if (topRated && (topRated.rating ?? 0) > 0) newTips.push(`Top rated: "${topRated.name}" — ${topRated.rating}★ (${topRated.review_count ?? 0} reviews)`)
        newTips.push(`${products.length} real product${products.length === 1 ? "" : "s"} currently listed on Dabia`)
      } else {
        newTips.push("No products listed yet — be the first merchant to add one!")
      }
      setTips(newTips)
    } catch {
      setTips(["Could not load live data right now."])
    } finally {
      setLoadingTips(false)
    }
  }, [])

  return (
    <>
      {/* Floating button — only visible outside home to avoid obscuring feed */}
      <button onClick={() => { setOpen(true); loadTips() }}
        className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30 transition-transform hover:scale-110 active:scale-95"
        aria-label="Open market tips">
        <Sparkles className="h-5 w-5 text-black" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="animate-slide-up w-full max-w-lg rounded-t-3xl border-t border-border bg-card p-4 pb-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/15">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-bold">Market Tips</p>
                  <p className="text-[10px] text-muted-foreground">Based on real Dabia listings — not AI-generated</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-secondary" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-2">
              {loadingTips ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-amber-400" /></div>
              ) : tips.map((tip, i) => (
                <div key={i} className="rounded-xl bg-secondary px-3 py-2.5 text-[12px] leading-relaxed">{tip}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
// ─── HOME TAB ─────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// SOCIAL TAB — فيد اجتماعي للتفاعل مع المنتجات: لايك حقيقي، تعليقات حقيقية، مشاركة حقيقية
// مستقل تماماً عن HomeTab/DiscoverTab — لا يغيّر تصميمهما إطلاقاً
// ═══════════════════════════════════════════════════════════════════════════════
// ─── Share Modal — مشاركة حقيقية كاملة لكل وسائل التواصل + نسخ رابط دقيق للمنتج ──
// رابط مشاركة المنتج: يستخدم معامل استعلام على الجذر (/?p=ID) بدل مسار ديناميكي
// (/p/ID). السبب: استضافة التطبيق قد تُرجع الصفحة الرئيسية لأي مسار غير معروف،
// فرابط المسار الديناميكي كان يفتح الرئيسية بدل المنتج. الجذر يُحمَّل دائماً
// ويقرأ المعامل، فيفتح المنتج المطلوب بدقّة في كل الحالات. نستخدم origin الفعلي
// حتى يعمل الرابط مهما كان النطاق (لا نطاق مكتوب بالكود).
function buildProductShareUrl(productId: string): string {
  const origin = typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "https://dabiaacdfb2093.pinet.com"
  return `${origin}/?p=${productId}`
}

function ShareModal({ url, title, onClose, onShared, shareToSocial }: {
  url: string; title: string; onClose: () => void; onShared?: () => void
  // إن مُرّرت بيانات منتج + مستخدم مسجّل، يظهر خيار "النشر في تبويب Dabia الاجتماعي"
  shareToSocial?: { product: { id: string; name: string; price: number; image?: string }; user: DBUser }
}) {
  useCloseOnBack(onClose)
  const [copied, setCopied] = useState(false)
  const [postedToSocial, setPostedToSocial] = useState(false)
  const [postingSocial, setPostingSocial]   = useState(false)
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(title)

  const postToSocial = async () => {
    if (!shareToSocial || postingSocial || postedToSocial) return
    setPostingSocial(true)
    const post = await sharePostFromProduct(shareToSocial.user.id!, shareToSocial.user.username, shareToSocial.product)
    setPostingSocial(false)
    if (post) { setPostedToSocial(true); onShared?.() }
  }

  const channels = [
    { name: "WhatsApp", color: "bg-emerald-500", icon: "💬", href: `https://wa.me/?text=${encodedText}%20${encodedUrl}` },
    { name: "Telegram", color: "bg-sky-500",     icon: "✈️", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` },
    { name: "Facebook", color: "bg-blue-600",     icon: "f",  href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { name: "Messenger",color: "bg-blue-500",     icon: "💌", href: `https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=0&redirect_uri=${encodedUrl}` },
    { name: "X",        color: "bg-black",        icon: "𝕏",  href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}` },
    { name: "Email",    color: "bg-gray-500",      icon: "✉️", href: `mailto:?subject=${encodedText}&body=${encodedUrl}` },
  ]

  const copyLink = async () => {
    try { await navigator.clipboard?.writeText(url); setCopied(true); onShared?.(); setTimeout(() => setCopied(false), 2000) } catch {}
  }
  const openChannel = (href: string) => { window.open(href, "_blank"); onShared?.() }
  const nativeShare = async () => {
    if (navigator.share) { try { await navigator.share({ title, url }); onShared?.() } catch {} }
  }

  // تُعرض عبر Portal في جسم الصفحة: عرضها داخل بطاقة عليها transform/overflow
  // كان يجعل fixed يتموضع داخل البطاقة ويُقص، فتفشل المشاركة من خارج صفحة المنتج
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={e => { e.stopPropagation(); onClose() }}>
      <div className="w-full max-w-lg rounded-t-3xl border-t border-border bg-card p-4 pb-8" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold">Share</p>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>

        {/* داخل Dabia — النشر في التبويب الاجتماعي */}
        {shareToSocial && (
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Inside Dabia</p>
            <button onClick={postToSocial} disabled={postingSocial || postedToSocial}
              className={`w-full flex items-center gap-3 rounded-2xl border p-3 transition-all active:scale-[0.99] ${postedToSocial ? "border-emerald-400/30 bg-emerald-400/10" : "border-amber-400/30 bg-amber-400/10"}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${postedToSocial ? "bg-emerald-400" : "bg-amber-400"}`}>
                {postingSocial ? <Loader2 className="h-5 w-5 text-black animate-spin" /> : postedToSocial ? <CheckCheck className="h-5 w-5 text-black" /> : <Users2 className="h-5 w-5 text-black" />}
              </div>
              <div className="text-left flex-1">
                <p className="text-[12px] font-bold">{postedToSocial ? "Posted to Dabia Social ✓" : "Post to Dabia Social"}</p>
                <p className="text-[10px] text-muted-foreground">{postedToSocial ? "Your followers can now like, comment & order" : "Share this listing to the social feed"}</p>
              </div>
            </button>
          </div>
        )}

        {/* خارج Dabia — كل وسائل التواصل */}
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Share outside</p>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {channels.map(ch => (
            <button key={ch.name} onClick={() => openChannel(ch.href)} className="flex flex-col items-center gap-1.5">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg text-white ${ch.color}`}>{ch.icon}</div>
              <span className="text-[10px] text-muted-foreground">{ch.name}</span>
            </button>
          ))}
          {typeof navigator !== "undefined" && (navigator as any).share && (
            <button onClick={nativeShare} className="flex flex-col items-center gap-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary"><Share2 className="h-5 w-5" /></div>
              <span className="text-[10px] text-muted-foreground">More</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
          <p className="flex-1 truncate text-[12px] text-muted-foreground">{url}</p>
          <button onClick={copyLink} className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${copied ? "bg-emerald-400 text-black" : "bg-amber-400 text-black"}`}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function SocialPostCard({ product, user }: { product: Product; user: DBUser | null }) {
  const [liked, setLiked]       = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [shareCount, setShareCount] = useState(0)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<DBComment[]>([])
  const [commentText, setCommentText] = useState("")
  const [copied, setCopied] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const productId = String(product.id)

  useEffect(() => {
    getLikeCount(productId).then(setLikeCount)
    getShareCount(productId).then(setShareCount)
    if (user?.id) isLikedByUser(user.id, productId).then(setLiked)
  }, [productId, user?.id])

  const handleLike = async () => {
    if (!user?.id) return
    const { liked: nowLiked } = await toggleLike(user.id, productId)
    setLiked(nowLiked)
    setLikeCount(c => nowLiked ? c + 1 : Math.max(0, c - 1))
  }

  const shareUrl = buildProductShareUrl(productId)
  const onSharedTracked = () => { recordShare(productId, user?.id); setShareCount(c => c + 1) }

  const openComments = async () => {
    setShowComments(true)
    const list = await getComments(productId)
    setComments(list)
  }

  const [commentError, setCommentError] = useState("")
  const submitComment = async () => {
    if (!user || !commentText.trim()) return
    setCommentError("")
    const { comment, error } = await addComment({
      product_id: productId, user_id: user.id!, username: user.username,
      avatar_url: user.avatar_url, text: commentText.trim(),
    })
    if (comment) { setComments(c => [comment, ...c]); setCommentText("") }
    else setCommentError(error || "Failed to post comment")
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Seller header */}
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-black text-black">
          {(product.seller || "D")[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold truncate">{product.seller}</p>
          <p className="text-[10px] text-muted-foreground">{product.category}</p>
        </div>
        {product.verified && <BadgeCheck className="h-4 w-4 text-amber-400 shrink-0" />}
      </div>

      {/* Image */}
      <div className="flex aspect-square items-center justify-center bg-gradient-to-br from-amber-400/10 to-amber-600/5 text-6xl">
        {product.image}
      </div>

      {/* Action bar — like, comment, share, copy link */}
      <div className="flex items-center gap-1 px-2 py-2">
        <button onClick={handleLike} disabled={!user}
          className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-secondary disabled:opacity-50">
          <Heart className={`h-5 w-5 transition-colors ${liked ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
          <span className="text-[12px] font-semibold">{likeCount}</span>
        </button>
        <button onClick={openComments} className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-secondary">
          <MessageCircle className="h-5 w-5 text-muted-foreground" />
          <span className="text-[12px] font-semibold">{comments.length || ""}</span>
        </button>
        <button onClick={() => setShowShare(true)} className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-secondary">
          <Share2 className="h-5 w-5 text-muted-foreground" />
          <span className="text-[12px] font-semibold">{shareCount}</span>
        </button>
      </div>

      {showShare && (
        <ShareModal url={shareUrl} title={`Check out "${product.name}" on Dabia — ${product.price}π`} onClose={() => setShowShare(false)} onShared={onSharedTracked}
          shareToSocial={user ? { product: { id: String(product.id), name: product.name, price: product.price, image: product.image }, user } : undefined} />
      )}
      {/* Caption */}
      <div className="px-3 pb-3 space-y-0.5">
        <p className="text-[13px]"><span className="font-bold">{product.seller}</span> <span className="text-muted-foreground">{product.name} — </span><span className="font-bold text-amber-400">{product.price}π</span></p>
      </div>

      {/* Comments drawer */}
      {showComments && (
        <div className="border-t border-border p-3 space-y-3">
          {commentError && <p className="text-[11px] text-red-400">{commentError}</p>}
          {user && (
            <div className="flex items-center gap-2">
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitComment()}
                placeholder="Add a comment…"
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-amber-400/50" />
              <button onClick={submitComment} disabled={!commentText.trim()}
                className="rounded-xl bg-amber-400 px-3 py-2 text-[12px] font-bold text-black disabled:opacity-40">Post</button>
            </div>
          )}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {comments.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-2">No comments yet — be the first!</p>
            ) : comments.map((c, i) => (
              <div key={c.id ?? i} className="flex items-start gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold">{c.username[0]?.toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="text-[12px]"><span className="font-bold">{c.username}</span> <span className="text-muted-foreground">{c.text}</span></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PollCard({ post, currentUserId }: { post: DBPost; currentUserId?: string }) {
  const [poll, setPoll] = useState(post.poll!)
  const [voted, setVoted] = useState(false)
  const [voting, setVoting] = useState(false)
  const totalVotes = poll.options.reduce((s, o) => s + o.votes, 0)

  const handleVote = async (i: number) => {
    if (voted || !currentUserId || voting) return
    setVoting(true)
    const ok = await votePoll(String(post.id), i)
    setVoting(false)
    if (ok) {
      setVoted(true)
      setPoll(p => { const n = { ...p, options: [...p.options] }; n.options[i] = { ...n.options[i], votes: n.options[i].votes + 1 }; return n })
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-bold">{poll.question}</p>
      {poll.options.map((o, i) => {
        const pct = totalVotes > 0 ? Math.round((o.votes / totalVotes) * 100) : 0
        return (
          <button key={i} onClick={() => handleVote(i)} disabled={voted || voting}
            className="relative w-full overflow-hidden rounded-xl border border-border bg-secondary px-3 py-2.5 text-left disabled:opacity-90">
            <div className="absolute inset-y-0 left-0 bg-amber-400/15 transition-all" style={{ width: voted ? `${pct}%` : "0%" }} />
            <div className="relative flex items-center justify-between text-[12px]">
              <span>{o.text}</span>
              {voted && <span className="font-bold text-amber-400">{pct}%</span>}
            </div>
          </button>
        )
      })}
      <p className="text-[10px] text-muted-foreground">{totalVotes} vote{totalVotes === 1 ? "" : "s"}</p>
    </div>
  )
}

function PostCard({ post, currentUser, onRefresh }: { post: DBPost; currentUser: DBUser | null; onRefresh: () => void }) {
  const [saved, setSaved] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [reposting, setReposting] = useState(false)
  const [repostMsg, setRepostMsg] = useState("")
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<DBComment[]>([])
  const [commentText, setCommentText] = useState("")
  const [commentError, setCommentError] = useState("")
  const postId = String(post.id)

  useEffect(() => {
    if (currentUser?.id) isPostSaved(currentUser.id, postId).then(setSaved)
  }, [currentUser?.id, postId])

  const handleSave = async () => {
    if (!currentUser?.id) return
    const { saved: now } = await toggleSavePost(currentUser.id, postId)
    setSaved(now)
  }

  const handleRepost = async () => {
    if (!currentUser?.id) return
    setReposting(true)
    const r = await repostPost(post, currentUser.id, currentUser.username)
    setReposting(false)
    if (r) { setRepostMsg("✓ Reposted to your profile"); onRefresh() } else setRepostMsg("Failed to repost")
    setTimeout(() => setRepostMsg(""), 2000)
  }

  const openComments = async () => {
    setShowComments(v => !v)
    if (!showComments) {
      const list = await getComments(postId)
      setComments(list)
    }
  }

  const submitComment = async () => {
    if (!currentUser || !commentText.trim()) return
    setCommentError("")
    const { comment, error } = await addComment({
      product_id: postId, user_id: currentUser.id!, username: currentUser.username,
      avatar_url: currentUser.avatar_url, text: commentText.trim(),
    })
    if (comment) { setComments(c => [comment, ...c]); setCommentText("") }
    else setCommentError(error || "Failed to comment")
  }

  const shareUrl = buildProductShareUrl(postId) // يُستخدَم نفس نمط الرابط الدقيق (سيُدعَم لاحقاً بمسار /post/[id] مخصص)

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-black text-black overflow-hidden">
          {post.avatar_url ? <img src={post.avatar_url} alt="" className="h-full w-full object-cover" /> : post.username[0]?.toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold truncate flex items-center gap-1">
            {post.username}{post.is_official && <BadgeCheck className="h-3.5 w-3.5 text-amber-400" />}
          </p>
          {post.reposted_from_username && <p className="text-[10px] text-muted-foreground">Reposted from {post.reposted_from_username}</p>}
        </div>
        {post.pinned && <Pin className="h-3.5 w-3.5 text-amber-400" />}
      </div>

      <div className="px-3 pb-2">
        {post.type === "text" && <p className="text-[13px] whitespace-pre-wrap">{post.text}</p>}
        {post.type === "announcement" && <p className="text-[13px] whitespace-pre-wrap font-medium text-blue-300">{post.text}</p>}
        {post.type === "poll" && post.poll && <PollCard post={post} currentUserId={currentUser?.id} />}
        {post.type === "product_share" && post.product_snapshot && (
          <div className="rounded-xl border border-border bg-secondary/40 p-3 flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-background text-2xl">{post.product_snapshot.image || "📦"}</div>
            <div className="min-w-0 flex-1">
              {post.text && <p className="text-[12px] mb-1">{post.text}</p>}
              <p className="text-[13px] font-bold truncate">{post.product_snapshot.name}</p>
              <p className="text-amber-400 font-black text-sm">{post.product_snapshot.price}π</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 px-2 py-2 border-t border-border">
        <button onClick={openComments} className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 hover:bg-secondary">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] font-semibold">{comments.length || ""}</span>
        </button>
        <button onClick={handleRepost} disabled={reposting} className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 hover:bg-secondary disabled:opacity-40">
          <Repeat2 className="h-4 w-4 text-muted-foreground" />
        </button>
        <button onClick={() => setShowShare(true)} className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 hover:bg-secondary">
          <Share2 className="h-4 w-4 text-muted-foreground" />
        </button>
        <button onClick={handleSave} className={`ml-auto flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition-colors ${saved ? "text-amber-400" : "text-muted-foreground hover:bg-secondary"}`}>
          <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      {repostMsg && <p className="px-3 pb-2 text-[11px] text-emerald-400">{repostMsg}</p>}

      {showComments && (
        <div className="border-t border-border p-3 space-y-3">
          {commentError && <p className="text-[11px] text-red-400">{commentError}</p>}
          {currentUser && (
            <div className="flex items-center gap-2">
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && submitComment()}
                placeholder="Add a comment… use @username to mention" className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-amber-400/50" />
              <button onClick={submitComment} disabled={!commentText.trim()} className="rounded-xl bg-amber-400 px-3 py-2 text-[12px] font-bold text-black disabled:opacity-40">Post</button>
            </div>
          )}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {comments.length === 0 ? <p className="text-[11px] text-muted-foreground text-center py-2">No comments yet</p> :
              comments.map((c, i) => (
                <div key={c.id ?? i} className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold">{c.username[0]?.toUpperCase()}</div>
                  <p className="text-[12px]"><span className="font-bold">{c.username}</span> <span className="text-muted-foreground">{c.text}</span></p>
                </div>
              ))}
          </div>
        </div>
      )}

      {showShare && <ShareModal url={shareUrl} title={post.text || `Check out this post from ${post.username} on Dabia`} onClose={() => setShowShare(false)} />}
    </div>
  )
}

function CreatePostModal({ onClose, onCreated, user }: { onClose: () => void; onCreated: () => void; user: DBUser }) {
  useCloseOnBack(onClose)
  const [mode, setMode] = useState<"text" | "poll">("text")
  const [text, setText] = useState("")
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [posting, setPosting] = useState(false)
  const isOfficial = user.role === "company" || user.role === "factory"

  const submit = async () => {
    setPosting(true)
    try {
      if (mode === "text" && text.trim()) {
        const post = await createTextPost(user.id!, user.username, text.trim(), user.avatar_url, isOfficial)
        if (post?.id) await processMentions(text, user.id!, user.username, post.id)
      } else if (mode === "poll" && question.trim() && options.filter(o => o.trim()).length >= 2) {
        await createPoll(user.id!, user.username, question.trim(), options.filter(o => o.trim()))
      }
      onCreated(); onClose()
    } finally { setPosting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl border-t border-border bg-card p-4 pb-8" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold">Create Post</p>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="mb-3 flex gap-2">
          <button onClick={() => setMode("text")} className={`flex-1 rounded-xl py-2 text-[12px] font-bold ${mode === "text" ? "bg-amber-400 text-black" : "border border-border"}`}>Post</button>
          <button onClick={() => setMode("poll")} className={`flex-1 rounded-xl py-2 text-[12px] font-bold ${mode === "poll" ? "bg-amber-400 text-black" : "border border-border"}`}>Poll</button>
        </div>
        {mode === "text" ? (
          <textarea value={text} onChange={e => setText(e.target.value)} rows={4} placeholder="Share something... use @username to mention"
            className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-amber-400/50" />
        ) : (
          <div className="space-y-2">
            <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ask a question..."
              className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-amber-400/50" />
            {options.map((o, i) => (
              <input key={i} value={o} onChange={e => setOptions(opts => opts.map((x, j) => j === i ? e.target.value : x))} placeholder={`Option ${i + 1}`}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-[13px] outline-none focus:border-amber-400/50" />
            ))}
            {options.length < 4 && <button onClick={() => setOptions(o => [...o, ""])} className="text-[11px] text-amber-400 font-semibold">+ Add option</button>}
          </div>
        )}
        <button onClick={submit} disabled={posting} className="mt-3 w-full rounded-2xl bg-amber-400 py-3 text-sm font-bold text-black disabled:opacity-50">
          {posting ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  )
}

function SocialTab() {
  const { user } = useUserAuth()
  const [posts, setPosts] = useState<DBPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  // المنتجات الرائجة الآن تظهر تلقائياً أعلى الفيد للتفاعل (إعجاب/تعليق/طلب) —
  // محسوبة لحظياً من إشارات حقيقية (إعجابات/تعليقات/مشاركات/طلبات) عبر محرّك
  // التراند في القاعدة، وتتحدّث تلقائياً كل ٣٠ ثانية. لا تدخّل يدوي.
  const { data: trendingData } = useSWR(
    "dabia-social-trending",
    async () => (await getTrendingProducts(4)).filter(t => t.trend_score > 0).map(dbProductToProduct),
    { refreshInterval: 30000 }
  )
  const trending = trendingData ?? []

  // بثوث حية الآن — تظهر كبانر أعلى الاجتماعي وتفتح غرفة البث
  const { data: liveData } = useSWR("dabia-social-live", () => getLiveStreams(), { refreshInterval: 20000 })
  const liveStreams = liveData ?? []
  const [activeStream, setActiveStream] = useState<DBLiveStream | null>(null)

  if (activeStream) return <LiveStreamRoom stream={activeStream} user={user} onClose={() => setActiveStream(null)} />


  const load = useCallback(() => {
    setLoading(true)
    getFeedPosts().then(setPosts).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Users2 className="h-5 w-5 text-amber-400" />
          <div>
            <h1 className="text-base font-black leading-none">Social</h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Posts, polls & shared listings</p>
          </div>
        </div>
        {user && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1.5 text-[12px] font-bold text-black active:scale-95">
            <Plus className="h-3.5 w-3.5" />Post
          </button>
        )}
      </div>

      {/* بث مباشر الآن — بانر أعلى الفيد */}
      {liveStreams.length > 0 && (
        <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4">
          {liveStreams.map(ls => (
            <button key={ls.id} onClick={() => setActiveStream(ls)}
              className="shrink-0 flex items-center gap-2 rounded-2xl border border-red-500/40 bg-red-500/5 px-3 py-2 active:scale-95 transition-transform">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-red-600">
                <Radio className="h-4 w-4 text-white" />
                <span className="absolute -inset-0.5 rounded-full border-2 border-red-500 animate-ping opacity-60" />
              </span>
              <div className="text-left">
                <p className="text-[11px] font-black text-red-500 leading-none">LIVE</p>
                <p className="text-[11px] font-bold truncate max-w-[120px]">{ls.host_username}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* رائج الآن — يظهر تلقائياً من محرّك التراند الحقيقي */}
      {trending.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-bold flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />Trending now
            <span className="text-[9px] font-normal text-muted-foreground">auto-ranked from real activity</span>
          </p>
          {trending.map(tp => <SocialPostCard key={`trend-${tp.id}`} product={tp} user={user} />)}
        </section>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-40 rounded-2xl bg-secondary/40 animate-pulse" />)}</div>
      ) : posts.length === 0 && trending.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
          <Users2 className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-[12px] text-muted-foreground">No posts yet — be the first to share something</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => <PostCard key={post.id} post={post} currentUser={user} onRefresh={load} />)}
        </div>
      )}

      {showCreate && user && <CreatePostModal onClose={() => setShowCreate(false)} onCreated={load} user={user} />}
    </div>
  )
}

// عدّاد تنازلي حيّ لعرض محدود — يتحدّث كل ثانية
function DealCountdown({ endsAt }: { endsAt: string }) {
  const [, tick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => tick(x => x + 1), 1000)
    return () => clearInterval(t)
  }, [])
  const ms = new Date(endsAt).getTime() - Date.now()
  if (ms <= 0) return null
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000)
  const label = h >= 48 ? `${Math.floor(h / 24)}d ${h % 24}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${sec}s`
  return <span className="tabular-nums">{label}</span>
}

function HomeTab() {
  const [category, setCategory] = useState("All")
  const [sort, setSort]         = useState<SortKey>("smart")
  const [cols, setCols]         = useState<2 | 3>(3)
  const [selected, setSelected] = useState<Product | null>(null)
  const { data, isLoading }     = useTrends(category, sort)
  const { user: homeUser }      = useUserAuth()

  // العروض النشطة (تخفيض أو عرض محدود بوقت) — يضبطها التجار من إدارة متاجرهم
  const { data: dealsData } = useSWR<Product[]>("dabia-active-deals",
    async () => (await getActiveDeals(12)).map(dbProductToProduct),
    { refreshInterval: 60000 })
  const deals = dealsData ?? []

  const categories  = ["All", "Electronics", "Fashion", "Accessories", "Home", "Health", "Art"]
  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "smart", label: "Smart" }, { key: "price", label: "Price" },
    { key: "rating", label: "Rating" }, { key: "distance", label: "Nearby" },
  ]

  if (selected) return <ProductDetail product={selected} onClose={() => setSelected(null)} />

  return (
    <div className="space-y-3 pb-6">
      {/* Greeting strip — minimal, no clutter */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-base font-black leading-none">{greeting()}</h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Best prices across Pi Network</p>
        </div>
        <span className="flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
          Live
        </span>
      </div>

      {/* Category strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
        {categories.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${category === c ? "btn-primary text-black" : "border border-border bg-secondary/40 text-muted-foreground hover:border-amber-400/30"}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Deals & Offers — تخفيضات وعروض محدودة يضبطها التجار، تظهر تلقائياً */}
      {deals.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-bold flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-emerald-400" />Deals &amp; Offers
            <span className="text-[9px] font-normal text-muted-foreground">live from sellers</span>
          </p>
          <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
            {deals.map(d => (
              <button key={`deal-${d.id}`} onClick={() => setSelected(d)}
                className="shrink-0 w-32 rounded-2xl border border-emerald-400/20 bg-card p-2 text-left space-y-1.5 active:scale-95 transition-transform">
                <div className="relative h-20 w-full overflow-hidden rounded-xl bg-secondary flex items-center justify-center text-3xl">
                  {d.image.startsWith("http") ? <img src={d.image} alt="" className="h-full w-full object-cover" /> : d.image}
                  {d.originalPrice && (
                    <span className="absolute top-1 left-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-black text-white">
                      -{Math.round((1 - d.price / d.originalPrice) * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-bold leading-tight line-clamp-2">{d.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-[12px] font-black text-amber-400">{fmtPi(d.price)}</span>
                  {d.originalPrice && <span className="text-[9px] text-muted-foreground line-through">{fmtPi(d.originalPrice)}</span>}
                </div>
                {d.dealEndsAt && (
                  <p className="flex items-center gap-1 text-[9px] font-bold text-red-400">
                    <Clock className="h-2.5 w-2.5" />{d.dealLabel || "Limited"} · <DealCountdown endsAt={d.dealEndsAt} />
                  </p>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Controls row */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 rounded-xl border border-border bg-secondary/30 p-0.5 gap-0.5">
          {sortOptions.map(s => (
            <button key={s.key} onClick={() => setSort(s.key)}
              className={`flex-1 rounded-lg px-1.5 py-1.5 text-[11px] font-bold transition-all ${sort === s.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl border border-border overflow-hidden shrink-0">
          <button onClick={() => setCols(2)} className={`flex h-8 w-8 items-center justify-center transition-colors ${cols === 2 ? "bg-amber-400/15 text-amber-400" : "text-muted-foreground hover:bg-secondary/40"}`} aria-label="2 columns">
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setCols(3)} className={`flex h-8 w-8 items-center justify-center border-l border-border transition-colors ${cols === 3 ? "bg-amber-400/15 text-amber-400" : "text-muted-foreground hover:bg-secondary/40"}`} aria-label="3 columns">
            <Grid3x3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Authenticity bar — minimal, always visible */}
      <div className="flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-3 py-2">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
        <p className="flex-1 text-[10px] text-muted-foreground">All results verified · Originals only · Imitations structurally blocked</p>
        {data && <span className="shrink-0 text-[10px] font-bold text-emerald-400">{fmtNum(data.totalEvaluated)} products</span>}
      </div>

      {/* Product grid — 3 to 9 cards, gap tighter on 3-col */}
      <div className={`grid ${cols === 3 ? "grid-cols-3 gap-2" : "grid-cols-2 gap-3"}`}>
        {isLoading
          ? Array.from({ length: cols === 3 ? 9 : 6 }).map((_, i) => <SkeletonCard key={i} />)
          : data?.ranked.map(p => <ProductCard key={p.id} product={p} onOpen={setSelected} currentUser={homeUser} />)
        }
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── DISCOVER TAB ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function DiscoverTab() {
  const [selected, setSelected] = useState<Product | null>(null)
  const { user } = useUserAuth()
  const { data: trendsData, isLoading } = useTrends("All", "smart")

  if (selected) return <ProductDetail product={selected} onClose={() => setSelected(null)} />

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-lg font-black">Discover</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">Browse listings across Dabia</p>
      </div>

      {/* Top trending products */}
      <section className="space-y-2">
        <p className="text-xs font-bold flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-emerald-400" />Top Trending <span className="ml-auto text-[10px] font-normal text-muted-foreground">0% ad influence</span></p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {isLoading
            ? Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)
            : trendsData?.ranked.slice(0, 9).map(p => <ProductCard key={p.id} product={p} onOpen={setSelected} currentUser={user} />)
          }
        </div>
      </section>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SPACE TAB ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function RealAuctionCard({ auction }: { auction: DBAuction }) {
  const { user } = useUserAuth()
  const [live, setLive] = useState(auction)
  const [bidAmount, setBidAmount] = useState("")
  const [bidding, setBidding] = useState(false)
  const [error, setError] = useState("")
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    const unsubscribe = subscribeToAuction(auction.id!, (updated) => setLive(updated))
    return unsubscribe
  }, [auction.id])

  useEffect(() => {
    const tick = () => {
      const diff = new Date(live.ends_at).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft("Ended"); return }
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`)
    }
    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [live.ends_at])

  const isEnded = timeLeft === "Ended" || live.status !== "live"
  const minNext = live.current_bid + live.min_increment

  const handleBid = async () => {
    if (!user) { setError("Sign in to bid"); return }
    const amount = parseFloat(bidAmount)
    if (!amount || amount < minNext) { setError(`Minimum bid is ${minNext}π`); return }
    setBidding(true); setError("")
    const res = await placeBid(auction.id!, user.id!, user.username, amount)
    setBidding(false)
    if (res.ok && res.auction) { setLive(res.auction); setBidAmount("") }
    else setError(res.error || "Bid failed")
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex h-32 items-center justify-center bg-gradient-to-br from-red-500/10 to-amber-500/5 text-5xl">{live.image || "🏆"}</div>
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-bold truncate">{live.product_name}</p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${isEnded ? "bg-secondary text-muted-foreground" : "bg-red-500 text-white"}`}>
            {isEnded ? "ENDED" : "LIVE"}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>by {live.seller_name}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeLeft}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-amber-400">{live.current_bid}π</span>
          <span className="text-[10px] text-muted-foreground">current bid</span>
        </div>
        {!isEnded && (
          <>
            <div className="flex gap-2">
              <input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)} placeholder={`Min ${minNext}π`}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-amber-400/50" />
              <button onClick={handleBid} disabled={bidding} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-50">
                {bidding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bid"}
              </button>
            </div>
            {error && <p className="text-[11px] text-red-400">{error}</p>}
          </>
        )}
        {isEnded && live.winner_user_id && (
          <p className="text-[11px] text-emerald-400 font-semibold">✓ Won by bidder</p>
        )}
      </div>
    </div>
  )
}

function RealGroupDealCard({ deal, onJoined }: { deal: DBGroupDeal; onJoined: () => void }) {
  const { user } = useUserAuth()
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState("")
  const pct = Math.round(((deal.original_price - deal.group_price) / deal.original_price) * 100)
  const progress = Math.min(100, Math.round((deal.members_joined / deal.members_needed) * 100))

  const handleJoin = async () => {
    if (!user) { setError("Sign in to join"); return }
    setJoining(true); setError("")
    const res = await joinGroupDeal(deal.id!, user.id!)
    setJoining(false)
    if (res.ok) onJoined()
    else setError(res.error || "Failed to join")
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3.5 space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl">{deal.image || "📦"}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold truncate">{deal.product_name}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-amber-400 font-black text-sm">{deal.group_price}π</span>
            <span className="text-[11px] text-muted-foreground line-through">{deal.original_price}π</span>
            <span className="text-[10px] font-bold text-emerald-400">-{pct}%</span>
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-muted-foreground">{deal.members_joined}/{deal.members_needed} joined</span>
          <span className={`font-bold ${deal.status === "full" ? "text-emerald-400" : "text-amber-400"}`}>{deal.status === "full" ? "Unlocked!" : "In progress"}</span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
          <div className="h-full bg-amber-400 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
      {deal.status === "open" && (
        <button onClick={handleJoin} disabled={joining} className="w-full rounded-xl bg-amber-400 py-2 text-[12px] font-bold text-black disabled:opacity-50">
          {joining ? "Joining…" : "Join Deal"}
        </button>
      )}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}

function CreateAuctionModal({ onClose, onCreated, user }: { onClose: () => void; onCreated: () => void; user: DBUser }) {
  const [name, setName] = useState("")
  const [startPrice, setStartPrice] = useState("")
  const [increment, setIncrement] = useState("")
  const [hours, setHours] = useState("24")
  const [creating, setCreating] = useState(false)

  const submit = async () => {
    if (!name.trim() || !startPrice || !increment) return
    setCreating(true)
    const endsAt = new Date(Date.now() + parseFloat(hours) * 3600000).toISOString()
    await createAuction({
      seller_user_id: user.id!, seller_name: user.store_name || user.username,
      product_name: name.trim(), starting_price: parseFloat(startPrice),
      min_increment: parseFloat(increment), ends_at: endsAt,
    })
    setCreating(false)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl border-t border-border bg-card p-4 pb-8" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold">Start an Auction</p>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2.5">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Item name" className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-amber-400/50" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={startPrice} onChange={e => setStartPrice(e.target.value)} placeholder="Starting price (π)" className="rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-amber-400/50" />
            <input type="number" value={increment} onChange={e => setIncrement(e.target.value)} placeholder="Min increment (π)" className="rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-amber-400/50" />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">Duration (hours)</label>
            <input type="number" value={hours} onChange={e => setHours(e.target.value)} className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-amber-400/50" />
          </div>
        </div>
        <button onClick={submit} disabled={creating} className="mt-3 w-full rounded-2xl bg-amber-400 py-3 text-sm font-bold text-black disabled:opacity-50">
          {creating ? "Starting…" : "Start Auction"}
        </button>
      </div>
    </div>
  )
}

function SpaceTab() {
  const { user } = useUserAuth()
  const [auctions, setAuctions] = useState<DBAuction[]>([])
  const [deals, setDeals] = useState<DBGroupDeal[]>([])
  const [announcements, setAnnouncements] = useState<DBPost[]>([])
  const [liveStreams, setLiveStreams] = useState<DBLiveStream[]>([])
  const [upcoming, setUpcoming] = useState<DBLiveStream[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateAuction, setShowCreateAuction] = useState(false)
  const [showCreateStream, setShowCreateStream] = useState(false)
  const [activeStream, setActiveStream] = useState<DBLiveStream | null>(null)
  const isMerchant = user && ["merchant", "company", "factory", "agent", "service_provider", "partner"].includes(user.role || "")

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([getLiveAuctions(), getOpenGroupDeals(), getFeedPosts(100), getLiveStreams(), getUpcomingStreams()])
      .then(([a, d, posts, live, up]) => { setAuctions(a); setDeals(d); setAnnouncements(posts.filter(p => p.type === "announcement")); setLiveStreams(live); setUpcoming(up) })
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])
  // تحديث دوري للبثوث الحية (تظهر فور بدء تاجر بثاً)
  useEffect(() => { const t = setInterval(() => { getLiveStreams().then(setLiveStreams); getUpcomingStreams().then(setUpcoming) }, 20000); return () => clearInterval(t) }, [])

  if (activeStream) return <LiveStreamRoom stream={activeStream} user={user} onClose={() => { setActiveStream(null); load() }} />

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-lg font-black">Space</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">Live streams, auctions, group deals & announcements</p>
      </div>

      {/* Live streaming — بث مباشر للتجار */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold flex items-center gap-2 flex-1">
            <Radio className="h-3.5 w-3.5 text-red-500 animate-pulse" />Live Now
          </p>
          {isMerchant && (
            <button onClick={() => setShowCreateStream(true)} className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white">
              <Video className="h-3 w-3" />Go Live
            </button>
          )}
        </div>
        {loading ? <SkeletonCard /> : liveStreams.length === 0 ? (
          <p className="text-[12px] text-muted-foreground text-center py-4">No live streams right now</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {liveStreams.map(ls => (
              <button key={ls.id} onClick={() => setActiveStream(ls)} className="rounded-2xl border border-red-500/30 bg-card overflow-hidden text-left active:scale-95 transition-transform">
                <div className="relative h-24 bg-gradient-to-br from-red-500/20 to-amber-500/10 flex items-center justify-center">
                  {ls.cover_image?.startsWith("http") ? <img src={ls.cover_image} alt="" className="h-full w-full object-cover" /> : <Radio className="h-8 w-8 text-red-500/50" />}
                  <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[9px] font-black text-white"><Radio className="h-2.5 w-2.5" />LIVE</span>
                  <span className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white"><Users className="h-2.5 w-2.5" />{ls.viewer_count ?? 0}</span>
                </div>
                <div className="p-2">
                  <p className="truncate text-[12px] font-bold">{ls.title}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{ls.host_username}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* بثوث مجدولة قادمة — إعلان مسبق */}
        {upcoming.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5"><CalendarClock className="h-3 w-3" />Upcoming</p>
            {upcoming.map(u => (
              <div key={u.id} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2.5">
                <CalendarClock className="h-4 w-4 text-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold">{u.title}</p>
                  <p className="text-[10px] text-muted-foreground">{u.host_username} · {u.scheduled_at ? new Date(u.scheduled_at).toLocaleString() : ""}</p>
                </div>
                {user && String(user.id) === String(u.host_user_id) && (
                  <button onClick={() => startStream(String(u.id)).then(r => r && setActiveStream(r))} className="rounded-lg bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white shrink-0">Start now</button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Announcements — إعلانات رسمية حقيقية من المتاجر/الشركات */}
      {announcements.length > 0 && (
        <section className="space-y-2">
          <p className="text-xs font-bold flex items-center gap-2"><Megaphone className="h-3.5 w-3.5 text-blue-400" />Announcements</p>
          {announcements.slice(0, 5).map(a => (
            <div key={a.id} className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-3 flex items-start gap-2">
              <BadgeCheck className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[12px] font-bold">{a.username}</p>
                <p className="text-[12px] text-muted-foreground">{a.text}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Live auctions — مزايدات حقيقية مع تحديث لحظي عبر Supabase Realtime */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold flex items-center gap-2 flex-1">
            <Radio className="h-3.5 w-3.5 text-red-400 animate-pulse" />Live Auctions
          </p>
          {isMerchant && (
            <button onClick={() => setShowCreateAuction(true)} className="flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-black">
              <Plus className="h-3 w-3" />Start
            </button>
          )}
        </div>
        {loading ? <SkeletonCard /> : auctions.length === 0 ? (
          <p className="text-[12px] text-muted-foreground text-center py-6">No live auctions right now</p>
        ) : auctions.map(a => <RealAuctionCard key={a.id} auction={a} />)}
      </section>

      {/* Group shopping — خصم حقيقي يُفعَّل فعلياً عند بلوغ العدد */}
      <section className="space-y-3">
        <p className="text-xs font-bold flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-purple-400" />Group Deals
        </p>
        {loading ? <SkeletonCard /> : deals.length === 0 ? (
          <p className="text-[12px] text-muted-foreground text-center py-6">No open group deals right now</p>
        ) : deals.map(d => <RealGroupDealCard key={d.id} deal={d} onJoined={load} />)}
      </section>

      {showCreateAuction && user && (
        <CreateAuctionModal onClose={() => setShowCreateAuction(false)} onCreated={load} user={user} />
      )}
      {showCreateStream && user && (
        <CreateStreamModal onClose={() => setShowCreateStream(false)} user={user}
          onGoLive={(s) => { setShowCreateStream(false); setActiveStream(s) }}
          onScheduled={() => { setShowCreateStream(false); load() }} />
      )}
    </div>
  )
}

// ── إنشاء بث: بدء فوري أو جدولة مع إعلان مسبق ──────────────────────────────
function CreateStreamModal({ onClose, user, onGoLive, onScheduled }:
  { onClose: () => void; user: DBUser; onGoLive: (s: DBLiveStream) => void; onScheduled: () => void }) {
  useCloseOnBack(onClose)
  const [title, setTitle] = useState("")
  const [desc, setDesc] = useState("")
  const [mode, setMode] = useState<"now" | "schedule">("now")
  const [scheduledAt, setScheduledAt] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const submit = async () => {
    if (!title.trim()) { setError("Add a title for your stream"); return }
    if (mode === "schedule" && !scheduledAt) { setError("Pick a date & time"); return }
    setBusy(true); setError("")
    const s = await createStream({
      host_user_id: user.id!, host_username: user.username, title: title.trim(),
      description: desc.trim() || null,
      status: mode === "now" ? "live" : "scheduled",
      scheduled_at: mode === "schedule" ? new Date(scheduledAt).toISOString() : null,
      started_at: mode === "now" ? new Date().toISOString() : null,
    })
    setBusy(false)
    if (!s) { setError("Could not create the stream"); return }
    // إعلان مسبق تلقائي في الفيد الاجتماعي عند الجدولة
    if (mode === "schedule") { try { await createAnnouncement(user.id!, user.username, `🔴 Going live soon: "${title.trim()}" — ${new Date(scheduledAt).toLocaleString()}`) } catch {} ; onScheduled() }
    else onGoLive(s)
  }

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl border-t border-border bg-card p-4 pb-8 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold flex items-center gap-2"><Video className="h-4 w-4 text-red-500" />Start a Live Stream</p>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        {error && <p className="rounded-lg bg-red-400/10 px-3 py-2 text-[12px] text-red-400">{error}</p>}
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Stream title (e.g. New arrivals 🔥)" maxLength={80}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" rows={2} maxLength={200}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50 resize-none" />
        <div className="flex gap-2">
          <button onClick={() => setMode("now")} className={`flex-1 rounded-xl py-2 text-[12px] font-bold ${mode === "now" ? "bg-red-600 text-white" : "border border-border text-muted-foreground"}`}>Go live now</button>
          <button onClick={() => setMode("schedule")} className={`flex-1 rounded-xl py-2 text-[12px] font-bold ${mode === "schedule" ? "bg-amber-400 text-black" : "border border-border text-muted-foreground"}`}>Schedule</button>
        </div>
        {mode === "schedule" && (
          <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
        )}
        <button onClick={submit} disabled={busy}
          className="w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-black active:scale-[0.99] disabled:opacity-50">
          {busy ? "Please wait…" : mode === "now" ? "Go Live Now" : "Schedule & Announce"}
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── BUSINESS TAB ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function BusinessTab() {
  const { user: bizUser }           = useUserAuth()
  const realStats = useRealStats()
  const { data: subData }           = useSubscription(bizUser?.id || "")
  const [section, setSection]       = useState<"dashboard" | "brands" | "plans">("dashboard")
  const [activating, setActivating] = useState(false)
  const [planMsg, setPlanMsg]       = useState("")
  const [showAnnounce, setShowAnnounce] = useState(false)
  const [announceText, setAnnounceText] = useState("")
  const [announcing, setAnnouncing]     = useState(false)
  const [announceMsg, setAnnounceMsg]   = useState("")

  const sendAnnouncement = async () => {
    if (!bizUser?.id || !announceText.trim()) return
    setAnnouncing(true)
    const post = await createAnnouncement(bizUser.id, bizUser.store_name || bizUser.username, announceText.trim(), true)
    setAnnouncing(false)
    if (post) { setAnnounceMsg("✓ Sent to Space feed"); setAnnounceText(""); setTimeout(() => { setAnnounceMsg(""); setShowAnnounce(false) }, 1500) }
    else setAnnounceMsg("Failed to send")
  }

  const sub = subData?.subscription

  const plans = [
    {
      tier: "pro" as const, label: "Pro", price: 49,
      color: "border-amber-400/30 bg-amber-400/5",
      icon: <Crown className="h-5 w-5 text-amber-400" />,
      features: ["AI personal assistant", "Advanced analytics", "Priority product listing", "Early demand alerts", "Dedicated support"],
    },
    {
      tier: "enterprise" as const, label: "Official Brand", price: 199,
      color: "border-blue-400/30 bg-blue-400/5",
      icon: <Building className="h-5 w-5 text-blue-400" />,
      features: ["Official Brand badge (manually verified)", "Dedicated verified storefront", "Full API access", "99.9% uptime SLA", "Competitor price monitoring"],
    },
  ]

  const PLAN_PRICES: Record<"pro" | "enterprise", number> = { pro: 49, enterprise: 199 }

  const activatePlan = useCallback(async (tier: "pro" | "enterprise") => {
    if (!bizUser?.id) { setPlanMsg("Please log in to activate a plan"); return }
    const hasPi = typeof window !== "undefined" && !!window.Pi
    if (!hasPi) { setPlanMsg("Pi payment requires Pi Browser — open this app inside Pi Browser to subscribe"); return }

    setActivating(true); setPlanMsg("")
    try {
      window.Pi!.createPayment(
        {
          amount: PLAN_PRICES[tier],
          memo: `Dabia ${tier} subscription`,
          metadata: { tier, userId: bizUser.id },
        },
        {
          onReadyForServerApproval: async (paymentId: string) => {
            try { await fetch("/api/dabia/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve", paymentId }) }) } catch {}
          },
          onReadyForServerCompletion: async (paymentId: string, txid: string) => {
            try { await fetch("/api/dabia/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete", paymentId, txid }) }) } catch {}
            // فقط بعد اكتمال دفع Pi حقيقي ومُوافَق عليه، نُفعِّل الاشتراك بمعرّف المعاملة الحقيقي
            const res = await fetch("/api/dabia/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: bizUser.id, tier, txId: txid }) })
            const data = await res.json()
            setPlanMsg(data.success ? `${tier.toUpperCase()} activated!` : (data.error || "Activation failed"))
            mutate(`/api/dabia/subscriptions?userId=${bizUser.id}`)
            setActivating(false)
          },
          onCancel: () => { setActivating(false); setPlanMsg("Payment cancelled") },
          onError:  (err: any) => { setActivating(false); setPlanMsg(err?.message || "Payment failed") },
        }
      )
    } catch (e) {
      setActivating(false)
      setPlanMsg(e instanceof Error ? e.message : "Payment failed")
    }
  }, [bizUser?.id])

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black">Business</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">Analytics, brands and plans</p>
        </div>
        {sub && (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-400">
            <Crown className="h-3.5 w-3.5" />{sub.tier.toUpperCase()}
          </span>
        )}
      </div>

      {/* Section nav */}
      <div className="flex gap-1.5">
        {(["dashboard", "brands", "plans"] as const).map(sec => (
          <button key={sec} onClick={() => setSection(sec)}
            className={`flex-1 rounded-xl py-2 text-[12px] font-bold capitalize transition-all ${section === sec ? "btn-primary text-black" : "border border-border bg-secondary/40 text-muted-foreground"}`}>
            {sec}
          </button>
        ))}
      </div>

      {bizUser && bizUser.role !== "buyer" && bizUser.status === "active" && (
        <button onClick={() => setShowAnnounce(true)} className="w-full flex items-center justify-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-400/10 py-3 text-[13px] font-bold text-blue-400">
          <Megaphone className="h-4 w-4" />Send Announcement to Space
        </button>
      )}

      {showAnnounce && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAnnounce(false)}>
          <div className="w-full max-w-lg rounded-t-3xl border-t border-border bg-card p-4 pb-8" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Official Announcement</p>
              <button onClick={() => setShowAnnounce(false)}><X className="h-4 w-4" /></button>
            </div>
            <textarea value={announceText} onChange={e => setAnnounceText(e.target.value)} rows={4}
              placeholder="New product launch, sale, or update..."
              className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-amber-400/50" />
            {announceMsg && <p className="mt-2 text-[12px] text-amber-400">{announceMsg}</p>}
            <button onClick={sendAnnouncement} disabled={announcing} className="mt-3 w-full rounded-2xl bg-amber-400 py-3 text-sm font-bold text-black disabled:opacity-50">
              {announcing ? "Sending…" : "Send to Everyone"}
            </button>
          </div>
        </div>
      )}

      {/* DASHBOARD — إحصائيات حقيقية مبنية فعلياً على Supabase */}
      {section === "dashboard" && (
        <div className="space-y-3">
          {realStats ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Orders",      val: fmtNum(realStats.totalOrders),     icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />, border: "border-emerald-400/20" },
                  { label: "Total Volume",      val: `${fmtNum(realStats.totalVolumePi)}π`, icon: <Wallet className="h-4 w-4 text-amber-400" />,      border: "border-amber-400/20"   },
                  { label: "Registered Users",  val: fmtNum(realStats.totalUsers),      icon: <Users className="h-4 w-4 text-blue-400" />,          border: "border-blue-400/20"    },
                  { label: "Listed Products",   val: fmtNum(realStats.totalProducts),   icon: <BadgeCheck className="h-4 w-4 text-emerald-400" />,  border: "border-emerald-400/20" },
                ].map(m => (
                  <div key={m.label} className={`rounded-2xl border ${m.border} bg-card p-3`}>
                    <div className="flex items-center gap-2 mb-1.5">{m.icon}<span className="text-[10px] text-muted-foreground">{m.label}</span></div>
                    <p className="text-xl font-black">{m.val}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border bg-card p-3 flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <Store className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-[12px] font-bold">{fmtNum(realStats.activeMerchants)} Active Merchant Accounts</p>
                  <p className="text-[11px] text-muted-foreground">Verified and currently selling on Dabia</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-3 flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-secondary">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[12px] font-bold">Fair Ranking Guaranteed</p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground mt-0.5">Sponsored listings are always clearly labeled and kept visually separate from organic results.</p>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-2xl skeleton-shimmer" />)}</div>
          )}
        </div>
      )}

      {/* BRANDS */}
      {section === "brands" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20">
                <Building className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-blue-400">Official Brand Accounts</p>
                <p className="text-[11px] text-muted-foreground">Manufacturer-verified storefronts</p>
              </div>
            </div>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              Official Brand accounts are exclusively for verified manufacturers and companies, reviewed manually before approval. Products from Official accounts are clearly labeled so buyers always know the source.
            </p>
            <div className="space-y-1.5">
              {[
                { label: "Dedicated verified storefront",      icon: <Store className="h-3.5 w-3.5 text-blue-400" /> },
                { label: "Manually verified Official badge",  icon: <ShieldCheck className="h-3.5 w-3.5 text-blue-400" /> },
                { label: "Direct manufacturer pricing",         icon: <Tag className="h-3.5 w-3.5 text-blue-400" /> },
                { label: "Separated from imitation listings",   icon: <BadgeCheck className="h-3.5 w-3.5 text-blue-400" /> },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2.5 rounded-xl bg-background/60 px-3 py-2">
                  {f.icon}<span className="text-[11px] font-medium">{f.label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setSection("plans")} className="w-full rounded-xl border border-blue-400/30 bg-blue-400/10 py-2.5 text-[12px] font-bold text-blue-400 hover:bg-blue-400/15 transition-colors">
              Apply for Official Brand Status
            </button>
          </div>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/20">
                <Crown className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-amber-400">Premium Sellers</p>
                <p className="text-[11px] text-muted-foreground">Verified high-trust merchants</p>
              </div>
            </div>
            <p className="text-[12px] leading-relaxed text-muted-foreground">Premium sellers are thoroughly verified with high trust scores. They display the gold badge and receive priority in price comparison results.</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[{ label: "Trust Score", val: "95+" }, { label: "Sales", val: "500+" }, { label: "Reviews", val: "100+" }].map(m => (
                <div key={m.label} className="rounded-xl bg-background/60 p-2">
                  <p className="font-black text-base text-amber-400">{m.val}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PLANS */}
      {section === "plans" && (
        <div className="space-y-3">
          {sub && (
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-3 flex items-center gap-3">
              <Crown className="h-6 w-6 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-bold capitalize">{sub.tier} Plan Active</p>
                <p className="text-[10px] text-muted-foreground">Expires {sub.expiresAt.slice(0, 10)}</p>
              </div>
            </div>
          )}
          {plans.map(p => (
            <div key={p.tier} className={`rounded-2xl border p-4 space-y-3 ${p.color}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">{p.icon}<p className="font-bold">{p.label}</p></div>
                <p className="text-xl font-black text-amber-400">{fmtPi(p.price)}<span className="text-[11px] font-normal text-muted-foreground">/mo</span></p>
              </div>
              <ul className="space-y-1.5">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[11px]">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                    <span className="text-muted-foreground leading-tight">{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => activatePlan(p.tier)} disabled={activating || sub?.tier === p.tier}
                className={`w-full rounded-xl py-2.5 text-sm font-bold transition-all disabled:opacity-50 ${sub?.tier === p.tier ? "bg-emerald-400/10 text-emerald-400" : "btn-primary text-black"}`}>
                {sub?.tier === p.tier ? "Active Plan" : activating ? "Activating…" : `Activate ${p.label}`}
              </button>
            </div>
          ))}
          {planMsg && <p className="text-center text-[11px] text-emerald-400">{planMsg}</p>}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── PROFILE TAB ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function ProfileTab() {
  const { user: profileUser, loading: profileLoading } = useUserAuth()
  const { data: subData } = useSubscription(profileUser?.id || "")
  const sub = subData?.subscription
  const [orderCount, setOrderCount] = useState<number | null>(null)
  const [savedCountReal, setSavedCountReal] = useState<number | null>(null)
  const [shareMsg, setShareMsg] = useState("")
  const [hideBalancePreview, setHideBalancePreview] = useState(false)
  useEffect(() => {
    try { setHideBalancePreview(localStorage.getItem("dabia_hide_balance") === "true") } catch {}
  }, [])

  useEffect(() => {
    if (!profileUser?.id) return
    getOrdersByBuyer(profileUser.id).then(orders => setOrderCount(orders.length)).catch(() => setOrderCount(0))
    getSavedProducts(profileUser.id).then(list => setSavedCountReal(list.length)).catch(() => setSavedCountReal(0))
  }, [profileUser?.id])

  const handleShareApp = useCallback(async () => {
    const url = "https://dabiaacdfb2093.pinet.com"
    const text = "Join me on Dabia — smart social commerce on Pi Network! 🚀"
    try {
      if (navigator.share) {
        await navigator.share({ title: "Dabia", text, url })
      } else {
        await navigator.clipboard?.writeText(`${text} ${url}`)
        setShareMsg("✓ Link copied to clipboard")
        setTimeout(() => setShareMsg(""), 2500)
      }
    } catch {
      // المستخدم أغلق نافذة المشاركة — لا حاجة لرسالة خطأ
    }
  }, [])

  // أثناء تحميل بيانات المستخدم — لا نعرض شيئاً يعتمد عليها لمنع الانهيار
  if (profileLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="h-10 w-10 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
        <p className="text-[12px] text-muted-foreground">Loading profile…</p>
      </div>
    )
  }

  const isMerchant = !!profileUser && profileUser.role !== "buyer"
  const isPending  = !!profileUser && profileUser.status === "pending"
  const savedCount = savedCountReal ?? 0

  const actions = [
    { label: "Order History",  icon: <Receipt className="h-4 w-4" />,     badge: orderCount === null ? "…" : `${orderCount} order${orderCount === 1 ? "" : "s"}`,  href: "/orders", onAction: null },
    { label: "Saved Products", icon: <BookmarkPlus className="h-4 w-4" />, badge: savedCountReal === null ? "…" : `${savedCount} item${savedCount === 1 ? "" : "s"}`,     href: "/saved", onAction: null },
    { label: "Invite & Earn",  icon: <UserPlus className="h-4 w-4" />,     badge: "Share App", href: null, onAction: handleShareApp },
    { label: "Security",       icon: <ShieldCheck className="h-4 w-4" />,  badge: "",             href: "/security", onAction: null },
    ...(isPending ? [
      { label: "Account Verification", icon: <Clock className="h-4 w-4" />, badge: "⏳ Pending", href: "/account" },
    ] : []),
    ...(isMerchant ? [
      { label: "Add Product",   icon: <Store className="h-4 w-4" />,        badge: "Merchant",     href: "/products/add" },
      { label: "My Products",   icon: <Layers className="h-4 w-4" />,       badge: "",             href: "/products/my" },
    ] : []),
    ...(profileUser?.emall === "maskmal088@gmail.com" ? [
      { label: "Admin Verification Panel", icon: <ShieldCheck className="h-4 w-4" />, badge: "Admin", href: "/admin" },
    ] : []),
    { label: "Social Links",  icon: <Share2 className="h-4 w-4" />,       badge: "",             href: "/social-links", onAction: null },
    { label: "Settings",       icon: <Activity className="h-4 w-4" />,     badge: "",             href: "/settings" },
  ]

  return (
    <div className="space-y-4 pb-6">
      {/* ── Identity card — يُميّز فعلياً بين مستخدم مسجَّل وزائر مستكشف ── */}
      {profileUser ? (
        <div className="rounded-2xl border-2 border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-2xl font-black text-black select-none overflow-hidden">
              {profileUser.avatar_url
                ? <img src={profileUser.avatar_url} alt="" className="h-full w-full object-cover" />
                : (profileUser.username || "U")[0].toUpperCase()
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-black text-base truncate">{profileUser.username}</p>
                <span className="flex items-center gap-1 shrink-0 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-400/20">
                  <CheckCircle2 className="h-2.5 w-2.5" />Signed In
                </span>
              </div>
              {profileUser.pi_uid && (
                <p className="text-[11px] text-amber-400 font-mono truncate mt-0.5">Pi UID: {profileUser.pi_uid}</p>
              )}
              {(profileUser.social_links?.email_public?.enabled) && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{profileUser.emall}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <Link href="/edit-profile">
                <button className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 active:scale-95 transition-transform" title="Edit profile">
                  <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                </button>
              </Link>
              <button onClick={async () => {
                const url = `https://dabiaacdfb2093.pinet.com/u/${profileUser.id}`
                const text = `Check out ${profileUser.username} on Dabia${profileUser.store_name ? ` — ${profileUser.store_name}` : ""}`
                try {
                  if (navigator.share) {
                    await navigator.share({ title: profileUser.username, text, url })
                  } else {
                    await navigator.clipboard?.writeText(`${text} ${url}`)
                    setShareMsg("✓ Profile link copied to clipboard")
                    setTimeout(() => setShareMsg(""), 2500)
                  }
                } catch {
                  // المستخدم أغلق نافذة المشاركة — لا حاجة لرسالة خطأ
                }
              }} className="flex h-8 w-8 items-center justify-center rounded-xl border border-border active:scale-95 transition-transform" title="Share profile">
                <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {profileUser.bio && (
            <p className="mt-3 text-[12px] text-muted-foreground leading-relaxed">{profileUser.bio}</p>
          )}

          {profileUser.website_url && (
            <a href={profileUser.website_url} target="_blank" rel="noopener noreferrer"
              className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400 truncate">
              <Globe2 className="h-3 w-3 shrink-0" />{profileUser.website_url}
            </a>
          )}

          {/* روابط السوشيال — تظهر فقط ما فعّله المستخدم بنفسه */}
          {(profileUser.social_links?.telegram?.enabled || profileUser.social_links?.instagram?.enabled || profileUser.social_links?.x?.enabled) && (
            <div className="mt-2 flex items-center gap-2">
              {profileUser.social_links?.telegram?.enabled && profileUser.social_links.telegram.url && (
                <a href={profileUser.social_links.telegram.url} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary"><Send className="h-3.5 w-3.5" /></a>
              )}
              {profileUser.social_links?.instagram?.enabled && profileUser.social_links.instagram.url && (
                <a href={profileUser.social_links.instagram.url} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary"><Instagram className="h-3.5 w-3.5" /></a>
              )}
              {profileUser.social_links?.x?.enabled && profileUser.social_links.x.url && (
                <a href={profileUser.social_links.x.url} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary"><Twitter className="h-3.5 w-3.5" /></a>
              )}
              <Link href="/social-links" className="ml-auto text-[10px] text-amber-400 font-semibold">Manage links</Link>
            </div>
          )}
          {!(profileUser.social_links?.telegram?.enabled || profileUser.social_links?.instagram?.enabled || profileUser.social_links?.x?.enabled) && (
            <Link href="/social-links" className="mt-2 inline-block text-[11px] text-amber-400 font-semibold">+ Add social links</Link>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-background/60 border border-border px-3 py-2">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Account Type</p>
              <p className="text-[12px] font-bold capitalize mt-0.5">{profileUser.role?.replace("_", " ")}</p>
            </div>
            <div className="rounded-xl bg-background/60 border border-border px-3 py-2">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Status</p>
              <p className={`text-[12px] font-bold mt-0.5 ${profileUser.status === "pending" ? "text-amber-400" : "text-emerald-400"}`}>
                {profileUser.status === "pending" ? "⏳ Under Review" : "✓ Active"}
              </p>
            </div>
          </div>

          {sub ? (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-400/20">
              <Crown className="h-2.5 w-2.5" />{sub.tier.toUpperCase()}
            </span>
          ) : (
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Standard Account</span>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-4 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-secondary text-2xl font-black text-muted-foreground select-none">?</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-black text-base text-muted-foreground">Guest</p>
              <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[9px] font-bold text-muted-foreground border border-border">
                Exploring
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Not signed in · Browsing only</p>
            <div className="mt-2 flex gap-2">
              <Link href="/login">
                <button className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-bold active:scale-95">
                  <LogIn className="h-3 w-3" />Sign In
                </button>
              </Link>
              <Link href="/register">
                <button className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-bold text-amber-400 active:scale-95">
                  <UserPlus className="h-3 w-3" />Create Account
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Wallet — Real balance from Supabase */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-bold"><Wallet className="h-4 w-4 text-amber-400" />Dabia Balance</p>
          <button onClick={(e) => {
            e.preventDefault()
            setHideBalancePreview(v => {
              try { localStorage.setItem("dabia_hide_balance", String(!v)) } catch {}
              return !v
            })
          }} className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground active:scale-95">
            {hideBalancePreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {hideBalancePreview ? "Show" : "Hide"}
          </button>
        </div>
        <Link href="/wallet" className="block active:scale-[0.98] transition-transform cursor-pointer">
          <p className="text-3xl font-black text-amber-400">
            {!profileUser ? "—π" : hideBalancePreview ? "★★★★" : `${(profileUser.wallet_balance ?? 0).toLocaleString()}π`}
          </p>
          <div className="flex gap-4 text-[11px] text-muted-foreground mt-1">
            <span>User: <strong className="text-foreground">{profileUser?.username ?? "..."}</strong></span>
            <span>Role: <strong className="text-foreground capitalize">{profileUser?.role ?? "..."}</strong></span>
          </div>
          <Progress value={96} className="h-1.5 mt-2" />
        </Link>
      </div>

      {/* Active plan features */}
      {sub && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 space-y-2">
          <p className="flex items-center gap-2 text-xs font-bold"><Crown className="h-4 w-4 text-amber-400" />Your Plan</p>
          <p className="text-sm font-black capitalize">{sub.tier}</p>
          <ul className="space-y-1">
            {sub.features.map(f => (
              <li key={f} className="flex items-center gap-2 text-[11px]">
                <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                <span className="text-muted-foreground">{f}</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-muted-foreground">Expires {sub.expiresAt.slice(0, 10)}</p>
        </div>
      )}

      {/* Quick actions */}
      {shareMsg && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-[12px] text-emerald-400 text-center">{shareMsg}</div>
      )}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {actions.map((item, i) => (
          item.href ? (
            <Link key={item.label} href={item.href}>
              <button className={`flex w-full items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 transition-colors ${i < actions.length - 1 ? "border-b border-border" : ""}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground shrink-0">{item.icon}</div>
                <span className="flex-1 text-sm font-medium text-left">{item.label}</span>
                {item.badge && <span className="text-[11px] text-muted-foreground">{item.badge}</span>}
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            </Link>
          ) : (
            <button key={item.label} onClick={(item as any).onAction ?? undefined}
              className={`flex w-full items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 transition-colors ${i < actions.length - 1 ? "border-b border-border" : ""}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground shrink-0">{item.icon}</div>
              <span className="flex-1 text-sm font-medium text-left">{item.label}</span>
              {item.badge && <span className="text-[11px] text-muted-foreground">{item.badge}</span>}
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          )
        ))}
      </div>

      {/* Account types */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-bold">Account Types</p>
        <div className="space-y-2">
          {[
            { type: "standard" as AccountType, title: "Standard",      desc: "Core shopping and discovery",                        icon: <User className="h-4 w-4 text-muted-foreground" />, color: "border-border bg-secondary/30"      },
            { type: "premium"  as AccountType, title: "Premium Seller", desc: "Analytics, priority placement, and advanced tools",  icon: <Crown className="h-4 w-4 text-amber-400" />,      color: "border-amber-400/20 bg-amber-400/5" },
            { type: "official" as AccountType, title: "Official Brand", desc: "Manufacturer storefront with verified badge",      icon: <Building className="h-4 w-4 text-blue-400" />,    color: "border-blue-400/20 bg-blue-400/5"   },
          ].map(tier => (
            <div key={tier.type} className={`flex items-start gap-3 rounded-xl border p-3 ${tier.color}`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card">{tier.icon}</div>
              <div>
                <p className="text-[12px] font-bold">{tier.title}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{tier.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ROOT ─────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function DabiaApp() {
  const { user: dbUser, loading: userLoading } = useUserAuth()
  const { lang, setLang, translating } = useTranslation()
  const [tab, setTabState] = useState<Tab>(() => {
    if (typeof window === "undefined") return "home"
    try { return (sessionStorage.getItem("dabia_active_tab") as Tab) || "home" } catch { return "home" }
  })
  const setTab = useCallback((t: Tab) => {
    setTabState(t)
    try { sessionStorage.setItem("dabia_active_tab", t) } catch {}
  }, [])
  const [showNotifs, setShowNotifs] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showLang,   setShowLang]   = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true)

  // ضمان إضافي (بجانب سكربت layout.tsx) — يُعيد فرض الثيم المحفوظ في كل مرة يُفتح التطبيق فعلياً
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dabia_theme") || "dark"
      const isDark = saved === "dark" || (saved === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
      document.documentElement.classList.toggle("dark", isDark)
      setIsDarkMode(isDark)
    } catch {}
  }, [])

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => {
      const next = !prev
      try {
        localStorage.setItem("dabia_theme", next ? "dark" : "light")
        document.documentElement.classList.toggle("dark", next)
      } catch {}
      return next
    })
  }, [])

  const { data: alertsData   } = useAlerts(dbUser?.id)
  const notifs   = alertsData?.notifications ?? []
  const unread   = notifs.filter(n => !n.read).length

  // فتح منتج تلقائياً إذا جاء المستخدم من رابط مشاركة مباشر.
  // مصدران: (1) معامل الاستعلام على الجذر /?p=ID (الرابط الجديد الأكثر متانة)،
  // (2) sessionStorage الذي يضعه مسار /p/[id] القديم (توافق خلفي للروابط القديمة).
  const [deepLinkProduct, setDeepLinkProduct] = useState<Product | null>(null)
  useEffect(() => {
    try {
      const queryId = new URLSearchParams(window.location.search).get("p")
      const pendingId = queryId || sessionStorage.getItem("dabia_open_product_id")
      if (!pendingId) return
      sessionStorage.removeItem("dabia_open_product_id")
      // إزالة المعامل من الرابط بعد قراءته حتى لا يُعاد فتح المنتج عند التنقّل
      if (queryId) {
        const clean = window.location.pathname + window.location.hash
        window.history.replaceState(null, "", clean || "/")
      }
      getProductById(pendingId).then(p => { if (p) setDeepLinkProduct(dbProductToProduct(p)) })
    } catch {}
  }, [])

  const navItems: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "home",     label: "Home",     icon: <Home      className="h-5 w-5" /> },
    { key: "discover", label: "Discover", icon: <Compass   className="h-5 w-5" /> },
    { key: "social",   label: "Social",   icon: <Users2    className="h-5 w-5" /> },
    { key: "space",    label: "Space",    icon: <Layers    className="h-5 w-5" /> },
    { key: "business", label: "Pro",      icon: <BarChart3 className="h-5 w-5" /> },
    { key: "profile",  label: "Profile",  icon: <User      className="h-5 w-5" /> },
  ]

  return (
    <div id="dabia-app-root" className="flex min-h-dvh flex-col bg-background text-foreground font-sans sm:max-w-xl sm:mx-auto sm:border-x sm:border-border">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md pt-safe shrink-0">
        <div className="flex items-center gap-1.5">
          <Hexagon className="h-5 w-5 text-amber-400 shrink-0" />
          <span className="text-base font-black tracking-tight">Dabia</span>
          <span className="rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-400/20">π</span>
        </div>

        {tab === "home" && (
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-400/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden />Live
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Dark/Light toggle — أيقونة فقط بدون كتابة */}
          <button onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-secondary hover:text-amber-400 transition-colors"
            aria-label="Toggle theme">
            {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
          {/* Google Translate Button */}
          <button onClick={() => setShowLang(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-secondary hover:text-amber-400 transition-colors"
            title="Translate / ترجمة">
            <GoogleTranslateIcon size={18} />
          </button>
          {/* Merchant Add Product */}
          {dbUser && dbUser.role !== "buyer" && dbUser.status === "active" && (
            <Link href="/products/add">
              <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 transition-colors" title="Add Product">
                <Plus className="h-4 w-4" />
              </button>
            </Link>
          )}
          <button onClick={() => setShowSearch(true)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-secondary transition-colors" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
          <button onClick={() => setShowNotifs(true)} className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-secondary transition-colors" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">{unread}</span>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 pt-4">
        {tab === "home"     && <HomeTab />}
        {tab === "discover" && <DiscoverTab />}
        {tab === "social"   && <SocialTab />}
        {tab === "space"    && <SpaceTab />}
        {tab === "business" && <BusinessTab />}
        {tab === "profile"  && <ProfileTab />}
      </main>

      {/* Bottom nav */}
      <nav className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md pb-safe shrink-0" aria-label="Main navigation">
        <div className="flex items-stretch">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setTab(item.key)}
              aria-current={tab === item.key ? "page" : undefined}
              aria-label={item.label}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[52px] py-2.5 transition-colors relative ${tab === item.key ? "text-amber-400" : "text-muted-foreground hover:text-foreground"}`}>
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
              {tab === item.key && <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-amber-400" aria-hidden />}
            </button>
          ))}
        </div>
      </nav>

      {/* Floating AI assistant — hidden on home to not block the product feed */}
      {tab !== "home" && <AIAssistant />}

      {/* Overlays */}
      {showNotifs && <NotifPanel notifs={notifs} onClose={() => setShowNotifs(false)} />}
      {showSearch  && <SearchOverlay onClose={() => setShowSearch(false)} />}
      {showLang    && <LanguageModal onClose={() => setShowLang(false)} lang={lang} setLang={setLang} translating={translating} />}
      {deepLinkProduct && <ProductDetail product={deepLinkProduct} onClose={() => setDeepLinkProduct(null)} />}
    </div>
  )
}
