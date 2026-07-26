"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserAuth } from "@/hooks/use-user-auth"
import { getOrdersBySeller, updateOrderStatus, getDisputesForSeller, resolveDispute, ORDER_STATUS_FLOW, type DBOrder, type DBDispute } from "@/lib/dabia/db"
import { X, Loader2, Package, Truck, CheckCircle2, Clock, XCircle, ChevronRight, MapPin, AlertTriangle } from "lucide-react"

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", preparing: "Preparing",
  shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled", refunded: "Refunded",
}
const STATUS_COLOR: Record<string, string> = {
  pending: "text-amber-400 bg-amber-400/10", confirmed: "text-blue-400 bg-blue-400/10",
  preparing: "text-purple-400 bg-purple-400/10", shipped: "text-cyan-400 bg-cyan-400/10",
  delivered: "text-emerald-400 bg-emerald-400/10", cancelled: "text-red-400 bg-red-400/10",
  refunded: "text-red-400 bg-red-400/10",
}

export default function SellerOrdersPage() {
  useDabiaTranslation()
  const router = useRouter()
  const { user } = useUserAuth()
  const [orders, setOrders] = useState<DBOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all")
  const [shipFor, setShipFor] = useState<DBOrder | null>(null)
  const [carrier, setCarrier] = useState("")
  const [trackingNo, setTrackingNo] = useState("")

  const [disputes, setDisputes] = useState<DBDispute[]>([])
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const load = () => {
    if (!user?.id) return
    setLoading(true)
    getOrdersBySeller(user.id).then(setOrders).finally(() => setLoading(false))
    getDisputesForSeller(user.id).then(setDisputes)
  }
  useEffect(() => { load() }, [user?.id])

  const handleResolve = async (d: DBDispute, resolution: "resolved" | "rejected" | "refunded") => {
    if (!user?.id || !d.id) return
    const note = resolution === "refunded" ? "Refund issued" : resolution === "rejected" ? undefined : window.prompt("Message to the buyer (optional)") || undefined
    setResolvingId(d.id)
    const updated = await resolveDispute(d.id, user.id, resolution, note)
    setResolvingId(null)
    if (updated) { setDisputes(prev => prev.map(x => x.id === d.id ? updated : x)); load() }
  }
  const openDisputes = disputes.filter(d => d.status === "open")

  if (!user) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <button onClick={() => router.push("/register")} className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black">Sign In</button>
    </div>
  )

  const advanceStatus = async (order: DBOrder, extra?: { carrier?: string; tracking_number?: string }) => {
    const idx = ORDER_STATUS_FLOW.indexOf(order.status as any)
    const next = ORDER_STATUS_FLOW[idx + 1]
    if (!next) return
    setUpdating(order.id!)
    const ok = await updateOrderStatus(order.id!, next, extra)
    if (ok) setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next, ...extra } : o))
    setUpdating(null)
  }

  // الانتقال إلى "shipped" يفتح نافذة إدخال شركة الشحن ورقم التتبّع
  const handleAdvance = (order: DBOrder) => {
    const idx = ORDER_STATUS_FLOW.indexOf(order.status as any)
    const next = ORDER_STATUS_FLOW[idx + 1]
    if (next === "shipped") { setShipFor(order); setCarrier(order.carrier || ""); setTrackingNo(order.tracking_number || "") }
    else advanceStatus(order)
  }

  const confirmShip = async () => {
    if (!shipFor) return
    await advanceStatus(shipFor, { carrier: carrier.trim() || undefined, tracking_number: trackingNo.trim() || undefined })
    setShipFor(null); setCarrier(""); setTrackingNo("")
  }

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black flex-1">Store Orders</p>
        <span className="text-[11px] text-muted-foreground">{orders.length} total</span>
      </header>

      <div className="flex gap-1.5 overflow-x-auto px-4 py-2.5 border-b border-border">
        {["all", "pending", "confirmed", "preparing", "shipped", "delivered"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold capitalize transition-colors ${filter === f ? "bg-amber-400 text-black" : "bg-secondary text-muted-foreground"}`}>
            {f}
          </button>
        ))}
      </div>

      {/* مركز النزاعات — يحسمها البائع (بما فيها الاسترداد الفعلي) */}
      {openDisputes.length > 0 && (
        <div className="border-b border-border bg-amber-400/5 p-4 space-y-2.5">
          <p className="text-[12px] font-black flex items-center gap-1.5 text-amber-400"><AlertTriangle className="h-4 w-4" />Open disputes ({openDisputes.length})</p>
          {openDisputes.map(d => (
            <div key={d.id} className="rounded-xl border border-amber-400/20 bg-card p-3 space-y-2">
              <p className="text-[11px] text-muted-foreground font-mono">Order #{String(d.order_id).slice(0, 8)}</p>
              <p className="text-[12px] font-bold">{d.reason}</p>
              {d.description && <p className="text-[11px] text-muted-foreground">{d.description}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => handleResolve(d, "refunded")} disabled={resolvingId === d.id}
                  className="rounded-lg bg-blue-500 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">Refund buyer</button>
                <button onClick={() => handleResolve(d, "resolved")} disabled={resolvingId === d.id}
                  className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">Mark resolved</button>
                <button onClick={() => handleResolve(d, "rejected")} disabled={resolvingId === d.id}
                  className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold text-muted-foreground disabled:opacity-50">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <Package className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-bold">No orders here</p>
          </div>
        ) : filtered.map(o => {
          const nextIdx = ORDER_STATUS_FLOW.indexOf(o.status as any)
          const next = ORDER_STATUS_FLOW[nextIdx + 1]
          const canAdvance = nextIdx >= 0 && !!next
          return (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground font-mono">#{o.id?.slice(0,8)}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[o.status || "pending"]}`}>{STATUS_LABEL[o.status || "pending"]}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl overflow-hidden">
                  {o.product_image?.startsWith("http") ? <img src={o.product_image} alt="" className="h-full w-full object-cover" /> : "📦"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold truncate">{o.product_name || "Product"}</p>
                  <p className="text-[11px] text-muted-foreground">Qty: {o.quantity ?? 1} · {o.total_price}π</p>
                </div>
              </div>
              {/* عنوان الشحن الذي أدخله المشتري — يحتاجه البائع فعلياً */}
              {o.shipping_address && (
                <div className="rounded-lg bg-secondary/40 px-2.5 py-1.5">
                  <p className="text-[10px] font-bold flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />Ship to</p>
                  <p className="text-[11px] text-foreground leading-relaxed">{o.shipping_address}</p>
                </div>
              )}
              {(o.carrier || o.tracking_number) && (
                <p className="text-[11px] text-cyan-400 bg-cyan-400/10 rounded-lg px-2.5 py-1.5">🚚 {o.carrier} {o.tracking_number}</p>
              )}
              {/* حالة الضمان للبائع */}
              <p className={`text-[10px] rounded-lg px-2.5 py-1.5 ${
                o.escrow_status === "released" ? "text-emerald-400 bg-emerald-400/10" :
                o.escrow_status === "refunded" ? "text-red-400 bg-red-400/10" :
                "text-amber-400 bg-amber-400/10"}`}>
                {o.escrow_status === "released" ? "✓ Payment released to you"
                  : o.escrow_status === "refunded" ? "↩ Payment refunded to buyer"
                  : "🔒 Payment held in escrow — released when the buyer confirms receipt"}
              </p>
              <p className="text-[10px] text-muted-foreground">{new Date(o.created_at!).toLocaleDateString()}</p>
              {canAdvance && o.status !== "cancelled" && (
                <button onClick={() => handleAdvance(o)} disabled={updating === o.id}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2 text-[12px] font-bold text-black disabled:opacity-40">
                  {updating === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  Mark as {STATUS_LABEL[next!]}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* نافذة الشحن — شركة الشحن ورقم التتبّع */}
      {shipFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShipFor(null)}>
          <div className="w-full max-w-lg rounded-t-3xl border-t border-border bg-card p-4 pb-8 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold flex items-center gap-2"><Truck className="h-4 w-4 text-cyan-400" />Ship order</p>
              <button onClick={() => setShipFor(null)}><X className="h-4 w-4" /></button>
            </div>
            <p className="text-[12px] text-muted-foreground">Add the carrier and tracking number so the buyer can follow the shipment.</p>
            <input value={carrier} onChange={e => setCarrier(e.target.value)} placeholder="Carrier (e.g. DHL, Aramex)" className="input-field w-full rounded-xl px-3 py-2.5 text-sm" />
            <input value={trackingNo} onChange={e => setTrackingNo(e.target.value)} placeholder="Tracking number" className="input-field w-full rounded-xl px-3 py-2.5 text-sm" />
            <button onClick={confirmShip} disabled={updating === shipFor.id}
              className="w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-black disabled:opacity-50">
              {updating === shipFor.id ? "Saving…" : "Mark as Shipped"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
