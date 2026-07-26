"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserAuth } from "@/hooks/use-user-auth"
import { getOrdersByBuyer, confirmOrderReceived, openDispute, getDisputeForOrder, type DBOrder, type DBDispute } from "@/lib/dabia/db"
import { X, Loader2, Package, CheckCircle2, Truck, Clock, MapPin, Copy, ChevronDown, ShieldCheck, AlertTriangle } from "lucide-react"

const DISPUTE_REASONS = ["Item not received", "Item not as described", "Damaged / defective", "Wrong item sent", "Other"]
const DISPUTE_STYLE: Record<string, string> = {
  open: "bg-amber-400/10 text-amber-400", resolved: "bg-emerald-400/10 text-emerald-400",
  rejected: "bg-red-400/10 text-red-400", refunded: "bg-blue-400/10 text-blue-400",
}

const STEPS = ["pending", "confirmed", "preparing", "shipped", "delivered"] as const
const STEP_LABEL: Record<string, string> = {
  pending: "Placed", confirmed: "Confirmed", preparing: "Preparing", shipped: "Shipped", delivered: "Delivered",
}
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-400", confirmed: "bg-emerald-400/10 text-emerald-400",
  preparing: "bg-blue-400/10 text-blue-400", shipped: "bg-blue-500/10 text-blue-500",
  delivered: "bg-emerald-500/10 text-emerald-500", cancelled: "bg-red-400/10 text-red-400", refunded: "bg-red-400/10 text-red-400",
}

function OrderCard({ order, buyerId, onConfirm }: { order: DBOrder; buyerId: string; onConfirm: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const status = order.status || "pending"
  const currentIdx = STEPS.indexOf(status as any)
  const isCancelled = status === "cancelled" || status === "refunded"

  const [dispute, setDispute] = useState<DBDispute | null>(null)
  const [showDispute, setShowDispute] = useState(false)
  const [dReason, setDReason] = useState(DISPUTE_REASONS[0])
  const [dDesc, setDDesc] = useState("")
  const [dBusy, setDBusy] = useState(false)
  useEffect(() => { if (open && order.id) getDisputeForOrder(order.id).then(setDispute) }, [open, order.id])

  // يمكن فتح نزاع طالما لم يُسترد المبلغ ولم يُلغَ الطلب، وبعد بدء التنفيذ فعلاً
  const canDispute = !dispute && !["pending", "cancelled", "refunded"].includes(status)

  const submitDispute = async () => {
    if (!order.id) return
    setDBusy(true)
    const d = await openDispute(order.id, buyerId, dReason, dDesc.trim() || undefined)
    setDBusy(false)
    if (d) { setDispute(d); setShowDispute(false); setDDesc("") }
  }

  const doConfirm = async () => {
    setConfirming(true)
    const ok = await confirmOrderReceived(order.id!)
    setConfirming(false)
    if (ok) onConfirm(order.id!)
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full p-4 space-y-2.5 text-left">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Order</p>
            <p className="text-[13px] font-black text-amber-400 tracking-wide">{order.order_number || `#${order.id?.slice(0, 8)}`}</p>
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[status] || STATUS_STYLE.pending}`}>{STEP_LABEL[status] || status}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-secondary flex items-center justify-center text-2xl">
            {order.product_image?.startsWith("http") ? <img src={order.product_image} alt="" className="h-full w-full object-cover" /> : (order.product_image || "📦")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold">{order.product_name || "Product"}</p>
            <p className="text-[11px] text-muted-foreground">Qty {order.quantity ?? 1} · {new Date(order.created_at!).toLocaleDateString()}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-amber-400 font-black">{order.total_price}π</p>
            <ChevronDown className={`h-4 w-4 text-muted-foreground ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-4">
          {/* خط زمني للتتبّع */}
          {!isCancelled ? (
            <div className="flex items-center">
              {STEPS.map((step, i) => {
                const done = i <= currentIdx
                return (
                  <div key={step} className="flex-1 flex flex-col items-center relative">
                    {i > 0 && <div className={`absolute right-1/2 top-2.5 h-0.5 w-full ${i <= currentIdx ? "bg-emerald-400" : "bg-border"}`} />}
                    <div className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full ${done ? "bg-emerald-400 text-black" : "bg-secondary text-muted-foreground"}`}>
                      {done ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    </div>
                    <span className={`mt-1 text-[8px] font-bold ${done ? "text-foreground" : "text-muted-foreground"}`}>{STEP_LABEL[step]}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="rounded-xl bg-red-400/10 px-3 py-2 text-[12px] font-bold text-red-400 text-center">{STEP_LABEL[status] || status}</p>
          )}

          {/* شحن + تتبّع خارجي */}
          {(order.carrier || order.tracking_number) && (
            <div className="rounded-xl border border-blue-400/20 bg-blue-400/5 p-3 space-y-1">
              <p className="text-[11px] font-bold flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-blue-400" />Shipment</p>
              {order.carrier && <p className="text-[11px] text-muted-foreground">Carrier: <span className="font-semibold text-foreground">{order.carrier}</span></p>}
              {order.tracking_number && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">Tracking: <span className="font-mono font-semibold text-foreground">{order.tracking_number}</span>
                  <button onClick={() => navigator.clipboard?.writeText(order.tracking_number!)}><Copy className="h-3 w-3" /></button></p>
              )}
            </div>
          )}

          {/* عنوان الشحن */}
          {order.shipping_address && (
            <div className="rounded-xl border border-border bg-secondary/20 p-3">
              <p className="text-[11px] font-bold flex items-center gap-1.5 mb-1"><MapPin className="h-3.5 w-3.5 text-amber-400" />Shipping to</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{order.shipping_address}</p>
            </div>
          )}

          {/* سجل الحالات */}
          {order.status_history && order.status_history.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold">History</p>
              {[...order.status_history].reverse().map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <div>
                    <span className="font-semibold">{STEP_LABEL[h.status] || h.status}</span>
                    {h.note && <span className="text-muted-foreground"> — {h.note}</span>}
                    <span className="block text-[10px] text-muted-foreground">{new Date(h.at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* حالة الضمان (Escrow) — حماية المشتري */}
          <div className={`flex items-center gap-2 rounded-xl border p-2.5 ${
            order.escrow_status === "released" ? "border-emerald-400/20 bg-emerald-400/5" :
            order.escrow_status === "refunded" ? "border-red-400/20 bg-red-400/5" :
            "border-amber-400/20 bg-amber-400/5"}`}>
            <ShieldCheck className={`h-4 w-4 shrink-0 ${
              order.escrow_status === "released" ? "text-emerald-400" :
              order.escrow_status === "refunded" ? "text-red-400" : "text-amber-400"}`} />
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              {order.escrow_status === "released" ? "Payment released to the seller after your confirmation."
                : order.escrow_status === "refunded" ? "Payment refunded to you."
                : "Payment is held securely and released to the seller only after you confirm receipt."}
            </p>
          </div>

          {order.pi_tx_id && <p className="text-[10px] text-muted-foreground font-mono truncate">Pi Tx: {order.pi_tx_id}</p>}

          {/* مركز النزاعات — حماية المشتري */}
          {dispute ? (
            <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" />Dispute</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${DISPUTE_STYLE[dispute.status]}`}>{dispute.status}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{dispute.reason}{dispute.description ? ` — ${dispute.description}` : ""}</p>
              {dispute.resolution_note && <p className="text-[11px] text-emerald-400">Seller: {dispute.resolution_note}</p>}
              {dispute.status === "refunded" && <p className="text-[11px] font-bold text-blue-400">✓ You were refunded.</p>}
            </div>
          ) : canDispute && (
            showDispute ? (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 space-y-2">
                <p className="text-[11px] font-bold">Report a problem</p>
                <select value={dReason} onChange={e => setDReason(e.target.value)}
                  className="w-full rounded-lg input-field px-2.5 py-2 text-[12px]">
                  {DISPUTE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <textarea value={dDesc} onChange={e => setDDesc(e.target.value)} rows={2} placeholder="Add details (optional)"
                  className="w-full rounded-lg input-field px-2.5 py-2 text-[12px] resize-none" />
                <div className="flex gap-2">
                  <button onClick={submitDispute} disabled={dBusy} className="rounded-lg bg-amber-400 px-3 py-1.5 text-[12px] font-bold text-black disabled:opacity-50">{dBusy ? "Submitting…" : "Submit dispute"}</button>
                  <button onClick={() => setShowDispute(false)} className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold text-muted-foreground">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowDispute(true)} className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-[12px] font-bold text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5" />Report a problem
              </button>
            )
          )}

          {/* تأكيد الاستلام — يُحرِّر مبلغ الضمان للبائع */}
          {status === "shipped" && (
            <button onClick={doConfirm} disabled={confirming}
              className="w-full rounded-xl bg-emerald-500 py-2.5 text-[13px] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50">
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Confirm received &amp; release payment
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  useDabiaTranslation()
  const router = useRouter()
  const { user } = useUserAuth()
  const [orders,  setOrders]  = useState<DBOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    getOrdersByBuyer(user.id).then(setOrders).finally(() => setLoading(false))
  }, [user?.id])

  const onConfirm = (id: string) => setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "delivered" } : o))

  if (!user) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <button onClick={() => router.push("/register")} className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black">Sign In</button>
    </div>
  )

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black flex-1">My Orders</p>
        <span className="text-[11px] text-muted-foreground">{orders.length} order{orders.length === 1 ? "" : "s"}</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <Package className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-sm font-bold">No orders yet</p>
            <p className="text-[12px] text-muted-foreground">Your purchases will appear here with live tracking</p>
          </div>
        ) : (
          orders.map(o => <OrderCard key={o.id} order={o} buyerId={user.id!} onConfirm={onConfirm} />)
        )}
      </div>
    </div>
  )
}
