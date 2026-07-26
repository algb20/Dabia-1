"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserAuth } from "@/hooks/use-user-auth"
import { getWalletBalance, getWalletTransactions, addWalletTransaction, requestWithdrawal, listWithdrawals, type DBWalletTransaction, type DBWithdrawal } from "@/lib/dabia/db"
import { X, ArrowUpRight, ArrowDownLeft, RefreshCw, Loader2, Wallet, Eye, EyeOff, Banknote } from "lucide-react"

export default function WalletPage() {
  useDabiaTranslation() // يُفعِّل ترجمة هذه الصفحة الفرعية عند فتحها بأي لغة مختارة
  const router = useRouter()
  const { user } = useUserAuth()
  const [balance,  setBalance]  = useState<number | null>(null)
  const [txs,      setTxs]      = useState<DBWalletTransaction[]>([])
  const [loading,  setLoading]  = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hideBalance, setHideBalance] = useState(false)
  const [withdrawals, setWithdrawals] = useState<DBWithdrawal[]>([])
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [wAmount, setWAmount] = useState("")
  const [wBusy, setWBusy] = useState(false)
  const [wError, setWError] = useState("")

  const submitWithdraw = async () => {
    if (!user?.id) return
    const amt = parseFloat(wAmount)
    if (!amt || amt <= 0) { setWError("Enter a valid amount"); return }
    setWBusy(true); setWError("")
    const res = await requestWithdrawal(user.id, amt)
    setWBusy(false)
    if (res.ok) { setShowWithdraw(false); setWAmount(""); load() }
    else setWError(res.error || "Failed")
  }

  useEffect(() => {
    try { setHideBalance(localStorage.getItem("dabia_hide_balance") === "true") } catch {}
  }, [])

  const toggleHideBalance = () => {
    setHideBalance(v => {
      try { localStorage.setItem("dabia_hide_balance", String(!v)) } catch {}
      return !v
    })
  }

  const load = async () => {
    if (!user?.id) return
    const [bal, transactions, wd] = await Promise.all([
      getWalletBalance(user.id),
      getWalletTransactions(user.id),
      listWithdrawals(user.id),
    ])
    setBalance(bal)
    setTxs(transactions)
    setWithdrawals(wd)
  }

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [user?.id])

  const handleRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  if (!user) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <button onClick={() => router.push("/register")} className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black">Sign In</button>
    </div>
  )

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black flex-1">Dabia Balance</p>
        <button onClick={handleRefresh} disabled={refreshing} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95 disabled:opacity-40">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {/* رصيد المحفظة */}
        <div className="rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-400/10 to-amber-600/5 p-6 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-amber-400" />
              <p className="text-[12px] font-semibold text-amber-400">Dabia Account Balance</p>
            </div>
            <button onClick={toggleHideBalance} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-secondary/60 active:scale-95 transition-colors">
              {hideBalance ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {hideBalance ? "Show" : "Hide"}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/80 -mt-1">Your in-app transaction balance, not a blockchain wallet address</p>
          {loading ? (
            <div className="h-10 w-32 rounded-xl bg-amber-400/10 animate-pulse" />
          ) : (
            <p className="text-4xl font-black text-amber-400">
              {hideBalance ? "★★★★" : (balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              {!hideBalance && <span className="text-xl ml-1">π</span>}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Connected as @{user.username} · {user.role}
          </p>
          {/* سحب الرصيد إلى محفظة Pi */}
          <button onClick={() => { setShowWithdraw(true); setWError("") }} disabled={(balance ?? 0) <= 0}
            className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-amber-400 py-2.5 text-[13px] font-bold text-black disabled:opacity-40 active:scale-[0.99]">
            <Banknote className="h-4 w-4" />Withdraw to Pi
          </button>
        </div>

        {/* طلبات السحب المعلّقة */}
        {withdrawals.filter(w => w.status === "pending").length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pending Withdrawals</p>
            {withdrawals.filter(w => w.status === "pending").map(w => (
              <div key={w.id} className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-bold">{w.amount}π</p>
                  <p className="text-[10px] text-muted-foreground">Requested {new Date(w.created_at!).toLocaleDateString()}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400">Processing</span>
              </div>
            ))}
          </div>
        )}

        {/* المعاملات */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Transaction History</p>
          {loading ? (
            Array.from({length:3}).map((_,i) => <div key={i} className="h-16 rounded-2xl bg-secondary/40 animate-pulse" />)
          ) : txs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-center border border-dashed border-border rounded-2xl">
              <Wallet className="h-8 w-8 text-muted-foreground/20" />
              <p className="text-[12px] text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            txs.map(tx => (
              <div key={tx.id} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  tx.type === 'payment' ? "bg-red-400/10" : "bg-emerald-400/10"
                }`}>
                  {tx.type === 'payment'
                    ? <ArrowUpRight className="h-5 w-5 text-red-400" />
                    : <ArrowDownLeft className="h-5 w-5 text-emerald-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate">{tx.description}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(tx.created_at!).toLocaleDateString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-[13px] font-black ${tx.type === 'payment' ? "text-red-400" : "text-emerald-400"}`}>
                    {hideBalance ? "★★★" : `${tx.type === 'payment' ? '-' : '+'}${tx.amount}π`}
                  </p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    tx.status === 'completed' ? "bg-emerald-400/10 text-emerald-400" :
                    tx.status === 'pending'   ? "bg-amber-400/10 text-amber-400" :
                                               "bg-red-400/10 text-red-400"
                  }`}>{tx.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* نافذة سحب الرصيد */}
      {showWithdraw && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowWithdraw(false)}>
          <div className="w-full max-w-lg rounded-t-3xl border-t border-border bg-card p-4 pb-8 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold flex items-center gap-2"><Banknote className="h-4 w-4 text-amber-400" />Withdraw to Pi</p>
              <button onClick={() => setShowWithdraw(false)}><X className="h-4 w-4" /></button>
            </div>
            <p className="text-[12px] text-muted-foreground">Available: <span className="font-bold text-foreground">{(balance ?? 0).toLocaleString()}π</span>. Your Pi is sent to your linked Pi wallet after review.</p>
            {wError && <p className="rounded-lg bg-red-400/10 px-3 py-2 text-[12px] text-red-400">{wError}</p>}
            {!user.pi_uid && <p className="rounded-lg bg-amber-400/10 px-3 py-2 text-[11px] text-amber-400">Link your Pi identity (open in Pi Browser) so we can pay you.</p>}
            <div className="flex items-center gap-2">
              <input type="number" value={wAmount} onChange={e => setWAmount(e.target.value)} placeholder="Amount in π" max={balance ?? 0}
                className="flex-1 rounded-xl input-field px-3 py-2.5 text-sm" />
              <button onClick={() => setWAmount(String(balance ?? 0))} className="rounded-xl border border-border px-3 py-2.5 text-[12px] font-bold text-muted-foreground">Max</button>
            </div>
            <button onClick={submitWithdraw} disabled={wBusy} className="w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-black disabled:opacity-50">
              {wBusy ? "Requesting…" : "Request withdrawal"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
