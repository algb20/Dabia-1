"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getUserById, getProductsBySeller, getPostsByUser, togglePinPost, followUser, unfollowUser, isFollowing, getFollowCounts, openDMThread, type DBUser, type DBProduct, type DBPost } from "@/lib/dabia/db"
import { getIdentityFields } from "@/lib/dabia/identity-fields"
import { useUserAuth } from "@/hooks/use-user-auth"
import { PiBrowserGate } from "@/components/pi-browser-gate"
import {
  X, Globe2, Send, Instagram, Twitter, Loader2, Store, ShieldCheck, CheckCircle2, Calendar, Info,
  Factory, Building2, Briefcase, Handshake, UserCircle2, ShoppingBag, MessageSquare, Pin, BadgeCheck, Crown,
} from "lucide-react"

// لمسة تصميم مميزة لكل نوع حساب — أيقونة ولون تمييز فقط (لا يغيّر هوية
// التطبيق الأساسية أمبر/داكن، فقط إشارة بصرية خفيفة تُشعر الزائر أنه دخل
// "فضاءً" يخص هذا القطاع بالتحديد، كما في أبحاث تصميم 2026 (Bento Grid +
// لمسات لونية حسب الهوية).
const ROLE_THEME: Record<string, { icon: any; accent: string; label: string }> = {
  buyer:            { icon: UserCircle2, accent: "from-amber-400/15",  label: "Member" },
  merchant:         { icon: ShoppingBag, accent: "from-amber-400/15",  label: "Store" },
  agent:            { icon: Handshake,   accent: "from-sky-400/15",    label: "Agent" },
  service_provider: { icon: Briefcase,   accent: "from-violet-400/15", label: "Service Provider" },
  company:          { icon: Building2,  accent: "from-blue-400/15",   label: "Company" },
  factory:          { icon: Factory,    accent: "from-orange-400/15", label: "Factory" },
  partner:          { icon: Handshake,  accent: "from-emerald-400/15", label: "Partner" },
}

export default function PublicProfilePage() {
  const router = useRouter()
  const params = useParams()
  const { user: viewer } = useUserAuth()
  const id = params?.id as string
  const [profile, setProfile] = useState<DBUser | null>(null)
  const [products, setProducts] = useState<DBProduct[]>([])
  const [posts, setPosts] = useState<DBPost[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"products" | "about" | "posts">("products")
  const [followed, setFollowed] = useState(false)
  const [counts, setCounts] = useState<{ followers: number; following: number }>({ followers: 0, following: 0 })
  const [followBusy, setFollowBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([getUserById(id), getProductsBySeller(id), getPostsByUser(id), getFollowCounts(id)])
      .then(([u, p, ps, c]) => { setProfile(u); setProducts(p); setPosts(ps); setCounts(c) })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (viewer?.id && id && viewer.id !== id) isFollowing(viewer.id, id).then(setFollowed)
  }, [viewer?.id, id])

  const isOwner = viewer?.id === id

  const toggleFollow = async () => {
    if (!viewer?.id || followBusy) return
    setFollowBusy(true)
    const next = !followed
    setFollowed(next)
    setCounts(c => ({ ...c, followers: c.followers + (next ? 1 : -1) }))
    if (next) await followUser(viewer.id, id); else await unfollowUser(viewer.id, id)
    setFollowBusy(false)
  }

  const [msgBusy, setMsgBusy] = useState(false)
  const startMessage = async () => {
    if (!viewer?.id) { router.push("/register"); return }
    setMsgBusy(true)
    const tid = await openDMThread(viewer.id, id)
    setMsgBusy(false)
    if (tid) router.push(`/messages/${tid}`)
  }
  const handlePin = async (postId: string, current: boolean) => {
    const ok = await togglePinPost(postId, !current)
    if (ok) setPosts(prev => prev.map(p => p.id === postId ? { ...p, pinned: !current } : p))
  }

  if (loading) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
    </div>
  )

  if (!profile) return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <p className="text-sm font-bold">Profile not found</p>
      <button onClick={() => router.push("/")} className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-black">Go to Dabia</button>
    </div>
  )

  const social = profile.social_links
  const isBusiness = profile.role !== "buyer"
  const identityFields = getIdentityFields(profile.role)
  const identityCard = (profile.profile?.identity_card || {}) as Record<string, string | string[]>
  const filledIdentity = identityFields
    .map(f => ({ field: f, value: identityCard[f.key] }))
    .filter(({ value }) => value && (!Array.isArray(value) || value.length > 0))
  const hasIdentityInfo = filledIdentity.length > 0
  const joinedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null
  const theme = ROLE_THEME[profile.role ?? "buyer"] ?? ROLE_THEME.buyer
  const RoleIcon = theme.icon

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PiBrowserGate always />
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.push("/")} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black">{isBusiness ? theme.label + " Space" : "Public Profile"}</p>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* ── رأس الفضاء: لمسة لونية + أيقونة تخص نوع الحساب، وكل إشارات الثقة مجمّعة ── */}
        <div className={`relative overflow-hidden border-b border-border bg-gradient-to-br ${theme.accent} to-transparent p-4 space-y-3`}>
          <RoleIcon className="absolute -right-4 -top-4 h-28 w-28 text-foreground/[0.04] rotate-12" strokeWidth={1} />
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-2xl font-black text-black overflow-hidden shadow-[0_4px_14px_rgba(251,191,36,0.35)]">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : (profile.username || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="font-black text-base truncate">{profile.store_name || profile.username}</p>
                {/* الشارة حسب نوع الحساب الحقيقي */}
                {profile.account_type === "official"
                  ? <BadgeCheck className="h-4 w-4 text-blue-400 shrink-0" />
                  : profile.account_type === "premium"
                  ? <Crown className="h-4 w-4 text-amber-400 shrink-0" />
                  : profile.status === "active" && <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />}
              </div>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground capitalize">
                <RoleIcon className="h-3 w-3" />@{profile.username} · {theme.label}
              </p>
            </div>
          </div>

          {/* إشارات الثقة: حالة التوثيق + Pi Network + تاريخ الانضمام — في صف واحد بدل تفرّقها */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {profile.status === "active" && (
              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Verified account</span>
            )}
            {profile.pi_uid && (
              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Pi Network identity</span>
            )}
            {joinedDate && (
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Joined {joinedDate}</span>
            )}
          </div>

          {/* المتابعون / يتابع + زر المتابعة */}
          <div className="flex items-center gap-4">
            <p className="text-[12px]"><span className="font-black">{counts.followers}</span> <span className="text-muted-foreground">Followers</span></p>
            <p className="text-[12px]"><span className="font-black">{counts.following}</span> <span className="text-muted-foreground">Following</span></p>
            {!isOwner && viewer && (
              <div className="ml-auto flex items-center gap-2">
                <button onClick={toggleFollow} disabled={followBusy}
                  className={`rounded-xl px-4 py-1.5 text-[12px] font-bold transition-colors disabled:opacity-50 ${followed ? "border border-border text-muted-foreground" : "bg-amber-400 text-black"}`}>
                  {followed ? "Following" : "Follow"}
                </button>
                <button onClick={startMessage} disabled={msgBusy}
                  className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-[12px] font-bold disabled:opacity-50">
                  <MessageSquare className="h-3.5 w-3.5" />Message
                </button>
              </div>
            )}
          </div>

          {profile.bio && <p className="text-[12px] text-muted-foreground leading-relaxed">{profile.bio}</p>}

          {profile.website_url && (
            <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] text-amber-400 truncate">
              <Globe2 className="h-3 w-3 shrink-0" />{profile.website_url}
            </a>
          )}

          {(social?.telegram?.enabled || social?.instagram?.enabled || social?.x?.enabled) && (
            <div className="flex items-center gap-2">
              {social?.telegram?.enabled && social.telegram.url && <a href={social.telegram.url} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary"><Send className="h-3.5 w-3.5" /></a>}
              {social?.instagram?.enabled && social.instagram.url && <a href={social.instagram.url} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary"><Instagram className="h-3.5 w-3.5" /></a>}
              {social?.x?.enabled && social.x.url && <a href={social.x.url} target="_blank" rel="noopener noreferrer" className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary"><Twitter className="h-3.5 w-3.5" /></a>}
            </div>
          )}
        </div>

        {/* ── تبويبات: منتجات/خدمات الفضاء + منشورات + حول ── */}
        <div className="flex border-b border-border">
          <button onClick={() => setTab("products")}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${tab === "products" ? "text-amber-400 border-b-2 border-amber-400" : "text-muted-foreground"}`}>
            {isBusiness ? "Showcase" : "Saved"} ({products.length})
          </button>
          <button onClick={() => setTab("posts")}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${tab === "posts" ? "text-amber-400 border-b-2 border-amber-400" : "text-muted-foreground"}`}>
            Posts ({posts.length})
          </button>
          {(hasIdentityInfo || isBusiness) && (
            <button onClick={() => setTab("about")}
              className={`flex-1 py-3 text-xs font-bold transition-colors ${tab === "about" ? "text-amber-400 border-b-2 border-amber-400" : "text-muted-foreground"}`}>
              About
            </button>
          )}
        </div>

        <div className="p-4">
          {tab === "products" && (
            products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {products.map(p => (
                  <div key={p.id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                    <div className="flex aspect-square items-center justify-center bg-secondary text-4xl">{p.image || "📦"}</div>
                    <div className="p-2.5">
                      <p className="text-[12px] font-bold truncate">{p.name}</p>
                      <p className="text-amber-400 font-black text-[13px]">{p.price}π</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <Store className="h-8 w-8" />
                <p className="text-[12px]">Nothing on display yet</p>
              </div>
            )
          )}

          {tab === "posts" && (
            posts.length > 0 ? (
              <div className="space-y-3">
                {posts.map(post => (
                  <div key={post.id} className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      {post.is_official && <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400"><BadgeCheck className="h-3 w-3" />Official</span>}
                      {isOwner && (
                        <button onClick={() => handlePin(post.id!, !!post.pinned)} className={`ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${post.pinned ? "bg-amber-400/15 text-amber-400" : "text-muted-foreground"}`}>
                          <Pin className="h-3 w-3" />{post.pinned ? "Pinned" : "Pin"}
                        </button>
                      )}
                    </div>
                    {post.type === "text" && <p className="text-[13px] whitespace-pre-wrap">{post.text}</p>}
                    {post.type === "product_share" && post.product_snapshot && (
                      <div className="rounded-xl border border-border bg-secondary/40 p-2.5 flex items-center gap-2.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background text-xl">{post.product_snapshot.image || "📦"}</div>
                        <div className="min-w-0">
                          {post.text && <p className="text-[11px] mb-0.5">{post.text}</p>}
                          <p className="text-[12px] font-bold truncate">{post.product_snapshot.name}</p>
                          <p className="text-amber-400 font-black text-[12px]">{post.product_snapshot.price}π</p>
                        </div>
                      </div>
                    )}
                    {post.type === "poll" && post.poll && (
                      <div className="space-y-1.5">
                        <p className="text-[12px] font-bold">{post.poll.question}</p>
                        {post.poll.options.map((o, i) => (
                          <div key={i} className="rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-[11px] flex justify-between">
                            <span>{o.text}</span><span className="text-muted-foreground">{o.votes} votes</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <MessageSquare className="h-8 w-8" />
                <p className="text-[12px]">No posts yet</p>
              </div>
            )
          )}

          {tab === "about" && (
            hasIdentityInfo ? (
              // Bento Grid: أول حقل (الأهم) يأخذ العرض الكامل، والباقي شبكة
              // متغيّرة المقاسات — تخطيط 2026 بدل بطاقات مكدّسة متجانسة.
              <div className="grid grid-cols-2 gap-3">
                {filledIdentity.map(({ field: f, value: v }, i) => (
                  <div key={f.key}
                    className={`rounded-2xl border border-border bg-card p-3.5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] ${
                      i === 0 || f.isList ? "col-span-2" : ""
                    }`}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{f.label}</p>
                    {Array.isArray(v) ? (
                      <div className="flex flex-wrap gap-1.5">
                        {v.map((tag, idx) => (
                          <span key={idx} className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400">{tag}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[14px] font-bold">{v}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <Info className="h-8 w-8" />
                <p className="text-[12px]">No additional details added yet</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
