"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserAuth } from "@/hooks/use-user-auth"
import { getOrdersByBuyer, type DBOrder } from "@/lib/dabia/db"
import { X, Receipt, Loader2, Package } from "lucide-react"

export default function OrdersPage() {
  useDabiaTranslation() // يُفعِّل ترجمة هذه الصفحة الفرعية عند فتحها بأي لغة مختارة
  const router = useRouter()
  const { user } = useUserAuth()
  const [orders,  setOrders]  = useState<DBOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    getOrdersByBuyer(user.id).then(setOrders).finally(() => setLoading(false))
  }, [user?.id])

  if (!user) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <button onClick={() => router.push("/register")} className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black">Sign In</button>
    </div>
  )

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black flex-1">Order History</p>
        <span className="text-[11px] text-muted-foreground">{orders.length} order{orders.length === 1 ? "" : "s"}</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <Package className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-sm font-bold">No orders yet</p>
            <p className="text-[12px] text-muted-foreground">Your purchases will appear here</p>
          </div>
        ) : (
          orders.map(o => (
            <div key={o.id} className="rounded-2xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground font-mono">#{o.id?.slice(0,8)}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  o.status === "confirmed" ? "bg-emerald-400/10 text-emerald-400" :
                  o.status === "shipped"   ? "bg-blue-400/10 text-blue-400" :
                                              "bg-amber-400/10 text-amber-400"
                }`}>{o.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Qty: {o.quantity ?? 1}</p>
                <p className="text-amber-400 font-black">{o.total_price}π</p>
              </div>
              {o.pi_tx_id && <p className="text-[10px] text-muted-foreground font-mono truncate">Tx: {o.pi_tx_id}</p>}
              <p className="text-[10px] text-muted-foreground">{new Date(o.created_at!).toLocaleDateString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
