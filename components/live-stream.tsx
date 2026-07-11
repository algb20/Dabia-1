"use client"
// ═══════════════════════════════════════════════════════════════════════════
// غرفة البث المباشر — بث حقيقي احترافي للتجارة داخل Dabia
//
// • الفيديو: كاميرا التاجر الحقيقية عبر WebRTC؛ الإشارات (signaling) تمرّ عبر
//   قناة Supabase Realtime broadcast الخاصة بكل بث. المضيف ينشئ اتصال نظير
//   لكل مشاهد (mesh) — بث حقيقي لجمهور معقول. للتوسّع لآلاف المشاهدين تُربط
//   خدمة بث متخصصة (SFU) لاحقاً دون تغيير باقي الغرفة.
// • الطبقة التفاعلية (تعليقات لحظية، منتجات معروضة، عرض مثبّت/مميز، حجز/طلب،
//   عدّاد مشاهدين) كلها حقيقية عبر Supabase Realtime وجداول القاعدة.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from "react"
import {
  supabase, type DBLiveStream, type DBStreamProduct, type DBStreamComment, type DBUser,
  getStreamProducts, getStreamComments, addStreamComment, addStreamReservation,
  pinStreamProduct, addStreamProduct, removeStreamProduct, endStream, setViewerCount,
  getProductsBySeller, type DBProduct,
} from "@/lib/dabia/db"
import { X, Radio, Send, ShoppingCart, CalendarClock, Pin, Plus, Users, Tag, Loader2, Video, VideoOff } from "lucide-react"

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }],
}

type SignalMsg =
  | { kind: "join"; from: string }
  | { kind: "offer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; from: string; to: string; candidate: RTCIceCandidateInit }
  | { kind: "host-left"; from: string }

function randomId() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

export function LiveStreamRoom({ stream, user, onClose }: { stream: DBLiveStream; user: DBUser | null; onClose: () => void }) {
  const isHost = !!user?.id && String(user.id) === String(stream.host_user_id)
  const streamId = String(stream.id)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [camError, setCamError] = useState("")
  const [ended, setEnded] = useState(stream.status === "ended")

  const [products, setProducts] = useState<DBStreamProduct[]>([])
  const [comments, setComments] = useState<DBStreamComment[]>([])
  const [commentText, setCommentText] = useState("")
  const [viewers, setViewers] = useState(0)
  const [reserving, setReserving] = useState<string | null>(null)
  const commentsEndRef = useRef<HTMLDivElement | null>(null)

  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const selfIdRef = useRef<string>(randomId())
  const signalRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // ── تحميل الحالة الأولية ────────────────────────────────────────────────
  const reloadProducts = useCallback(() => { getStreamProducts(streamId).then(setProducts) }, [streamId])
  useEffect(() => {
    getStreamComments(streamId).then(setComments)
    reloadProducts()
  }, [streamId, reloadProducts])

  useEffect(() => { commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [comments])

  // ── Realtime: تعليقات + منتجات + حالة البث + حضور المشاهدين ───────────────
  useEffect(() => {
    const ch = supabase.channel(`stream-room-${streamId}`, { config: { presence: { key: selfIdRef.current } } })

    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "stream_comments", filter: `stream_id=eq.${streamId}` },
      (payload: any) => setComments(prev => [...prev, payload.new as DBStreamComment]))
    ch.on("postgres_changes", { event: "*", schema: "public", table: "stream_products", filter: `stream_id=eq.${streamId}` },
      () => reloadProducts())
    ch.on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_streams", filter: `id=eq.${streamId}` },
      (payload: any) => { if ((payload.new as DBLiveStream).status === "ended") setEnded(true) })

    ch.on("presence", { event: "sync" }, () => {
      const count = Object.keys(ch.presenceState()).length
      setViewers(count)
      if (isHost) setViewerCount(streamId, count)
    })

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ online_at: Date.now(), host: isHost })
    })
    return () => { supabase.removeChannel(ch) }
  }, [streamId, isHost, reloadProducts])

  // ── WebRTC: المضيف يبث كاميرته، المشاهد يستقبل ────────────────────────────
  useEffect(() => {
    if (ended) return
    const signal = supabase.channel(`stream-signal-${streamId}`)
    signalRef.current = signal
    const selfId = selfIdRef.current

    const send = (msg: SignalMsg) => signal.send({ type: "broadcast", event: "signal", payload: msg })

    async function hostStart() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true })
        localStreamRef.current = media
        if (videoRef.current) { videoRef.current.srcObject = media; videoRef.current.muted = true; setVideoReady(true) }
      } catch (e) {
        setCamError("Could not access camera/microphone. Check permissions.")
      }
    }

    function createHostPeer(viewerId: string) {
      const existing = peersRef.current.get(viewerId)
      if (existing) existing.close()
      const pc = new RTCPeerConnection(RTC_CONFIG)
      peersRef.current.set(viewerId, pc)
      localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!))
      pc.onicecandidate = e => { if (e.candidate) send({ kind: "ice", from: selfId, to: viewerId, candidate: e.candidate.toJSON() }) }
      pc.onconnectionstatechange = () => { if (pc.connectionState === "failed" || pc.connectionState === "closed") { pc.close(); peersRef.current.delete(viewerId) } }
      pc.createOffer().then(offer => pc.setLocalDescription(offer).then(() => send({ kind: "offer", from: selfId, to: viewerId, sdp: offer })))
      return pc
    }

    async function viewerHandleOffer(hostId: string, sdp: RTCSessionDescriptionInit) {
      const pc = new RTCPeerConnection(RTC_CONFIG)
      peersRef.current.set(hostId, pc)
      pc.ontrack = e => { if (videoRef.current && e.streams[0]) { videoRef.current.srcObject = e.streams[0]; setVideoReady(true) } }
      pc.onicecandidate = e => { if (e.candidate) send({ kind: "ice", from: selfId, to: hostId, candidate: e.candidate.toJSON() }) }
      await pc.setRemoteDescription(new RTCSessionDescription(sdp))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      send({ kind: "answer", from: selfId, to: hostId, sdp: answer })
    }

    signal.on("broadcast", { event: "signal" }, async ({ payload }: { payload: SignalMsg }) => {
      if ("to" in payload && payload.to !== selfId) return
      try {
        if (isHost) {
          if (payload.kind === "join") createHostPeer(payload.from)
          else if (payload.kind === "answer") await peersRef.current.get(payload.from)?.setRemoteDescription(new RTCSessionDescription(payload.sdp))
          else if (payload.kind === "ice") await peersRef.current.get(payload.from)?.addIceCandidate(new RTCIceCandidate(payload.candidate))
        } else {
          if (payload.kind === "offer") await viewerHandleOffer(payload.from, payload.sdp)
          else if (payload.kind === "ice") await peersRef.current.get(payload.from)?.addIceCandidate(new RTCIceCandidate(payload.candidate))
          else if (payload.kind === "host-left") setEnded(true)
        }
      } catch { /* تجاهل إشارة تالفة مفردة */ }
    })

    signal.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return
      if (isHost) await hostStart()
      else send({ kind: "join", from: selfId }) // المشاهد يطلب البث من المضيف
    })

    return () => {
      if (isHost) send({ kind: "host-left", from: selfId })
      peersRef.current.forEach(pc => pc.close())
      peersRef.current.clear()
      localStreamRef.current?.getTracks().forEach(t => t.stop())
      supabase.removeChannel(signal)
    }
  }, [streamId, isHost, ended])

  const sendComment = async () => {
    const t = commentText.trim()
    if (!t || !user) return
    setCommentText("")
    await addStreamComment(streamId, user.id ?? null, user.username, t)
  }

  const reserve = async (sp: DBStreamProduct, kind: "reserve" | "order") => {
    if (!user?.id) return
    setReserving(sp.id + kind)
    await addStreamReservation(streamId, sp.product_id, user.id, user.username, kind)
    setReserving(null)
  }

  const handleEnd = async () => {
    signalRef.current?.send({ type: "broadcast", event: "signal", payload: { kind: "host-left", from: selfIdRef.current } })
    await endStream(streamId)
    setEnded(true)
  }

  const pinned = products.find(p => p.pinned)

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      {/* شريط علوي */}
      <div className="flex items-center gap-2 px-3 py-2 pt-safe bg-gradient-to-b from-black/70 to-transparent absolute top-0 inset-x-0 z-10">
        <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
          <Radio className="h-3 w-3" />{ended ? "ENDED" : "LIVE"}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white">
          <Users className="h-3 w-3" />{viewers}
        </span>
        <p className="flex-1 truncate text-[12px] font-bold text-white">{stream.title}</p>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white"><X className="h-4 w-4" /></button>
      </div>

      {/* الفيديو */}
      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {ended ? (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <VideoOff className="h-12 w-12" />
            <p className="text-sm font-bold">This live stream has ended</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
            {!videoReady && !camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">{isHost ? "Starting your camera…" : "Connecting to live stream…"}</p>
              </div>
            )}
            {camError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center text-white/80">
                <VideoOff className="h-10 w-10" /><p className="text-sm">{camError}</p>
              </div>
            )}
          </>
        )}

        {/* المنتج المثبّت — يعرضه التاجر لحظياً */}
        {pinned?.product && !ended && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 rounded-2xl bg-black/70 backdrop-blur p-2.5">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white/10 flex items-center justify-center text-2xl">
              {pinned.product.image?.startsWith("http") ? <img src={pinned.product.image} alt="" className="h-full w-full object-cover" /> : (pinned.product.image || "📦")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold text-white">{pinned.product.name}</p>
              <div className="flex items-center gap-1.5">
                {pinned.special_price != null ? (
                  <>
                    <span className="text-[13px] font-black text-amber-400">{pinned.special_price}π</span>
                    <span className="text-[10px] text-white/50 line-through">{pinned.product.price}π</span>
                    <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[8px] font-black text-white">LIVE OFFER</span>
                  </>
                ) : <span className="text-[13px] font-black text-amber-400">{pinned.product.price}π</span>}
              </div>
            </div>
            {!isHost && user && (
              <div className="flex flex-col gap-1">
                <button onClick={() => reserve(pinned, "order")} disabled={reserving === pinned.id + "order"}
                  className="flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1.5 text-[11px] font-bold text-black active:scale-95">
                  {reserving === pinned.id + "order" ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}Order
                </button>
                <button onClick={() => reserve(pinned, "reserve")} disabled={reserving === pinned.id + "reserve"}
                  className="flex items-center gap-1 rounded-lg border border-white/30 px-2.5 py-1.5 text-[11px] font-bold text-white active:scale-95">
                  <CalendarClock className="h-3 w-3" />Reserve
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* لوحة التاجر لإدارة البث */}
      {isHost && !ended && (
        <HostControls streamId={streamId} products={products} user={user!} onChanged={reloadProducts} onEnd={handleEnd} />
      )}

      {/* التعليقات اللحظية */}
      <div className="bg-black/95 border-t border-white/10 flex flex-col" style={{ height: "34vh" }}>
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {comments.length === 0 ? (
            <p className="text-center text-[11px] text-white/40 py-4">Say hello 👋</p>
          ) : comments.map(c => (
            <p key={c.id} className="text-[12px] text-white/90"><span className="font-bold text-amber-400">{c.username}</span> {c.text}</p>
          ))}
          <div ref={commentsEndRef} />
        </div>
        {user ? (
          <div className="flex items-center gap-2 border-t border-white/10 p-2 pb-safe">
            <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && sendComment()}
              placeholder="Add a comment…" className="flex-1 rounded-full bg-white/10 px-4 py-2 text-[13px] text-white outline-none placeholder:text-white/40" />
            <button onClick={sendComment} className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-black"><Send className="h-4 w-4" /></button>
          </div>
        ) : (
          <p className="border-t border-white/10 p-3 text-center text-[11px] text-white/50">Sign in to comment</p>
        )}
      </div>
    </div>
  )
}

// ── لوحة تحكم التاجر أثناء البث ─────────────────────────────────────────────
function HostControls({ streamId, products, user, onChanged, onEnd }:
  { streamId: string; products: DBStreamProduct[]; user: DBUser; onChanged: () => void; onEnd: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [myProducts, setMyProducts] = useState<DBProduct[]>([])
  const [specialPrice, setSpecialPrice] = useState<Record<string, string>>({})

  useEffect(() => { if (showAdd && user.id) getProductsBySeller(user.id).then(setMyProducts) }, [showAdd, user.id])

  return (
    <div className="bg-black/95 border-t border-white/10 px-3 py-2 space-y-2">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-[11px] font-bold text-white/70">Showcase ({products.length})</p>
        <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-bold text-white"><Plus className="h-3 w-3" />Add product</button>
        <button onClick={onEnd} className="rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white">End live</button>
      </div>

      {/* المنتجات المعروضة — تثبيت/عرض مميز/إزالة */}
      {products.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {products.map(sp => (
            <div key={sp.id} className={`shrink-0 w-36 rounded-xl border p-2 space-y-1 ${sp.pinned ? "border-amber-400 bg-amber-400/10" : "border-white/15 bg-white/5"}`}>
              <p className="truncate text-[11px] font-bold text-white">{sp.product?.name || `#${sp.product_id}`}</p>
              <div className="flex items-center gap-1">
                <input type="number" placeholder={`${sp.product?.price ?? ""}π offer`} defaultValue={sp.special_price ?? ""}
                  onChange={e => setSpecialPrice(p => ({ ...p, [sp.id!]: e.target.value }))}
                  className="w-full rounded bg-white/10 px-1.5 py-1 text-[10px] text-white outline-none" />
                <button onClick={() => addStreamProduct(streamId, sp.product_id, specialPrice[sp.id!] ? +specialPrice[sp.id!] : undefined).then(onChanged)}
                  className="shrink-0 rounded bg-white/15 px-1.5 py-1 text-[9px] font-bold text-white"><Tag className="h-3 w-3" /></button>
              </div>
              <div className="flex gap-1">
                <button onClick={() => pinStreamProduct(streamId, sp.id!).then(onChanged)}
                  className={`flex-1 flex items-center justify-center gap-0.5 rounded py-1 text-[9px] font-bold ${sp.pinned ? "bg-amber-400 text-black" : "bg-white/15 text-white"}`}>
                  <Pin className="h-2.5 w-2.5" />{sp.pinned ? "Shown" : "Show"}
                </button>
                <button onClick={() => removeStreamProduct(sp.id!).then(onChanged)} className="rounded bg-red-600/80 px-1.5 py-1 text-[9px] font-bold text-white"><X className="h-2.5 w-2.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2 space-y-1">
          {myProducts.length === 0 ? <p className="text-center text-[11px] text-white/40 py-2">No products in your store</p> :
            myProducts.filter(mp => !products.some(sp => String(sp.product_id) === String(mp.id))).map(mp => (
              <button key={mp.id} onClick={() => { addStreamProduct(streamId, mp.id!).then(() => { onChanged(); }) }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/10">
                <span className="text-lg">{mp.image?.startsWith("http") ? "🛍️" : (mp.image || "📦")}</span>
                <span className="flex-1 truncate text-[12px] text-white">{mp.name}</span>
                <span className="text-[11px] font-bold text-amber-400">{mp.price}π</span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
