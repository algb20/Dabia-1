"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useUserAuth } from "@/hooks/use-user-auth"
import {
  getReels, toggleSaveProduct, isProductSaved, toggleLike, isLikedByUser, getLikeCount, recordShare,
  type DBProduct,
} from "@/lib/dabia/db"
import { X, Heart, Bookmark, Share2, ShoppingBag, Loader2, Volume2, VolumeX, Play } from "lucide-react"

export default function ReelsPage() {
  useDabiaTranslation()
  const router = useRouter()
  const { user } = useUserAuth()
  const [reels, setReels] = useState<DBProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [muted, setMuted] = useState(true)

  useEffect(() => { getReels(40).then(setReels).finally(() => setLoading(false)) }, [])

  if (loading) return (
    <div className="flex min-h-dvh items-center justify-center bg-black"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
  )
  if (reels.length === 0) return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-black text-center px-6">
      <Play className="h-10 w-10 text-white/30" />
      <p className="text-sm font-bold text-white">No reels yet</p>
      <p className="text-[12px] text-white/50">Sellers can add a short video to their products to appear here.</p>
      <button onClick={() => router.push("/")} className="mt-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-black">Back to Dabia</button>
    </div>
  )

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-3 pt-safe">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 backdrop-blur text-white active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black text-white flex-1">Reels</p>
        <button onClick={() => setMuted(m => !m)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/40 backdrop-blur text-white">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </header>

      <div className="h-dvh w-full snap-y snap-mandatory overflow-y-scroll no-scrollbar">
        {reels.map(r => <Reel key={r.id} product={r} user={user} muted={muted} onOpen={() => router.push(`/?p=${r.id}`)} />)}
      </div>
    </div>
  )
}

function Reel({ product, user, muted, onOpen }: { product: DBProduct; user: any; muted: boolean; onOpen: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [shareMsg, setShareMsg] = useState("")

  useEffect(() => {
    const pid = String(product.id)
    getLikeCount(pid).then(setLikeCount)
    if (user?.id) { isLikedByUser(pid, user.id).then(setLiked); isProductSaved(user.id, pid).then(setSaved) }
  }, [product.id, user?.id])

  // تشغيل الفيديو الظاهر فقط، وإيقاف البقية (كتيك توك)
  useEffect(() => {
    const el = wrapRef.current, vid = videoRef.current
    if (!el || !vid) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) vid.play().catch(() => {})
      else { vid.pause(); vid.currentTime = 0 }
    }, { threshold: 0.6 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => { if (videoRef.current) videoRef.current.muted = muted }, [muted])

  const handleLike = async () => {
    if (!user?.id) return
    setLiked(v => !v); setLikeCount(c => c + (liked ? -1 : 1))
    await toggleLike(String(product.id), user.id)
  }
  const handleSave = async () => {
    if (!user?.id) return
    setSaved(v => !v)
    await toggleSaveProduct(user.id, String(product.id))
  }
  const handleShare = async () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/?p=${product.id}`
    try {
      if (navigator.share) await navigator.share({ title: product.name, url })
      else { await navigator.clipboard?.writeText(url); setShareMsg("✓ Link copied"); setTimeout(() => setShareMsg(""), 1800) }
      recordShare(String(product.id), user?.id)
    } catch {}
  }

  const discount = product.original_price && product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100) : null

  return (
    <div ref={wrapRef} className="relative h-dvh w-full snap-start flex items-center justify-center bg-black">
      {product.video_url ? (
        <video ref={videoRef} src={product.video_url} loop muted={muted} playsInline
          onClick={() => { const v = videoRef.current; if (v) { v.paused ? v.play() : v.pause() } }}
          className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-6xl">{product.image || "📦"}</div>
      )}

      {/* تدرّج سفلي لسهولة القراءة */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

      {/* أزرار التفاعل (يمين) */}
      <div className="absolute right-3 bottom-28 z-10 flex flex-col items-center gap-5">
        <button onClick={handleLike} className="flex flex-col items-center gap-1 text-white">
          <span className={`flex h-11 w-11 items-center justify-center rounded-full ${liked ? "bg-red-500" : "bg-black/40 backdrop-blur"}`}>
            <Heart className="h-5 w-5" fill={liked ? "currentColor" : "none"} />
          </span>
          <span className="text-[11px] font-bold">{likeCount || ""}</span>
        </button>
        <button onClick={handleSave} className="flex flex-col items-center gap-1 text-white">
          <span className={`flex h-11 w-11 items-center justify-center rounded-full ${saved ? "bg-amber-400 text-black" : "bg-black/40 backdrop-blur"}`}>
            <Bookmark className="h-5 w-5" fill={saved ? "currentColor" : "none"} />
          </span>
          <span className="text-[11px] font-bold">Save</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center gap-1 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur"><Share2 className="h-5 w-5" /></span>
          <span className="text-[11px] font-bold">Share</span>
        </button>
      </div>

      {/* معلومات المنتج (أسفل) + شراء */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 pb-6 space-y-2.5">
        <p className="text-[13px] font-bold text-white/80">{product.seller_name || "Dabia Seller"}</p>
        <p className="text-[15px] font-black text-white leading-tight line-clamp-2">{product.name}</p>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-amber-400">{product.price}π</span>
          {discount && <><span className="text-[12px] text-white/50 line-through">{product.original_price}π</span>
            <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-white">-{discount}%</span></>}
        </div>
        <button onClick={onOpen} className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 py-3 text-sm font-black text-black active:scale-[0.98]">
          <ShoppingBag className="h-4 w-4" />View &amp; Buy
        </button>
        {shareMsg && <p className="text-center text-[11px] text-emerald-400">{shareMsg}</p>}
      </div>
    </div>
  )
}
