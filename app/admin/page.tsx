"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useUserAuth } from "@/hooks/use-user-auth"
import {
  getPendingUsers, approveUser, rejectUser,
  meetsVerificationRequirements, VERIFICATION_REQUIREMENTS, getBusinessEmailSignal,
  adminListReports, adminResolveReport, adminListWithdrawals, markWithdrawalPaid,
  type DBUser, type DBReport, type DBWithdrawal
} from "@/lib/dabia/db"
import {
  X, ShieldCheck, CheckCircle2, XCircle, Loader2,
  Building, Store, Factory, Handshake, Briefcase, Users,
  RefreshCw, CheckCheck, AlertCircle, Flag, Trash2
} from "lucide-react"

const ROLE_ICON: Record<string, any> = {
  merchant: Store, company: Building, factory: Factory,
  agent: Handshake, service_provider: Briefcase, partner: Users,
}

export default function AdminPage() {
  useDabiaTranslation() // يُفعِّل ترجمة هذه الصفحة الفرعية عند فتحها بأي لغة مختارة
  const router = useRouter()
  const { user } = useUserAuth()
  const [pending,  setPending]  = useState<DBUser[]>([])
  const [loading,  setLoading]  = useState(true)
  const [busyId,   setBusyId]   = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [msg,      setMsg]      = useState("")

  // Admin access is granted by role='admin' in the users table (set via Supabase dashboard).
  // Falls back to the owner email so the first admin can bootstrap without a DB change.
  const isAdmin = user && (user.role === "admin" || user.emall === "maskmal088@gmail.com")

  const [reports, setReports] = useState<DBReport[]>([])
  const [payouts, setPayouts] = useState<DBWithdrawal[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const list = await getPendingUsers()
    setPending(list)
    if (user?.id) {
      adminListReports(user.id).then(setReports).catch(() => {})
      adminListWithdrawals(user.id).then(setPayouts).catch(() => {})
    }
    setLoading(false)
  }, [user?.id])

  useEffect(() => { if (isAdmin) load() }, [isAdmin, load])

  const resolveReport = async (r: DBReport, status: "actioned" | "dismissed", del = false) => {
    if (!user?.id || !r.id) return
    await adminResolveReport(user.id, r.id, status, del)
    setReports(prev => prev.filter(x => x.id !== r.id))
  }

  const payWithdrawal = async (w: DBWithdrawal) => {
    if (!user?.id || !w.id) return
    const tx = window.prompt(`Enter the Pi A2U transaction ID after sending ${w.amount}π to ${w.pi_uid || "the seller"}:`)
    if (tx === null) return
    await markWithdrawalPaid(user.id, w.id, tx.trim() || "manual", "paid")
    setPayouts(prev => prev.filter(x => x.id !== w.id))
  }
  const rejectWithdrawal = async (w: DBWithdrawal) => {
    if (!user?.id || !w.id || !confirm("Reject and refund this withdrawal to the seller's balance?")) return
    await markWithdrawalPaid(user.id, w.id, "", "rejected")
    setPayouts(prev => prev.filter(x => x.id !== w.id))
  }

  if (!user) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <button onClick={() => router.push("/register")} className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black">Sign In</button>
    </div>
  )
  if (!isAdmin) return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background gap-4 px-6 text-center">
      <ShieldCheck className="h-12 w-12 text-red-400" />
      <p className="text-sm font-bold">Admin access only</p>
      <p className="text-[12px] text-muted-foreground">This page is restricted to Dabia administrators.</p>
      <button onClick={() => router.push("/")} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold">Go Home</button>
    </div>
  )

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleApprove = async (id: string) => {
    setBusyId(id)
    await approveUser(id)
    setPending(prev => prev.filter(u => u.id !== id))
    setBusyId(null)
  }

  const handleReject = async (id: string) => {
    if (!confirm("Reject and suspend this account?")) return
    setBusyId(id)
    await rejectUser(id)
    setPending(prev => prev.filter(u => u.id !== id))
    setBusyId(null)
  }

  // ─── قبول متعدد للمحدَّدين يدوياً ──────────────────────────────────────────
  const handleBulkApprove = async () => {
    if (selected.size === 0) return
    setBulkBusy(true)
    for (const id of selected) {
      await approveUser(id)
    }
    setPending(prev => prev.filter(u => !selected.has(u.id!)))
    setSelected(new Set())
    setBulkBusy(false)
    setMsg(`✓ Approved ${selected.size} account(s)`)
    setTimeout(() => setMsg(""), 3000)
  }

  // ─── قبول تلقائي لكل من يستوفي شروط نوع حسابه فعلاً ──────────────────────
  const handleAutoApproveAll = async () => {
    setBulkBusy(true)
    const eligible = pending.filter(meetsVerificationRequirements)
    for (const u of eligible) {
      if (u.id) await approveUser(u.id)
    }
    setPending(prev => prev.filter(u => !eligible.some(e => e.id === u.id)))
    setBulkBusy(false)
    setMsg(eligible.length > 0
      ? `✓ Auto-approved ${eligible.length} account(s) that met requirements`
      : "No accounts currently meet auto-approval requirements")
    setTimeout(() => setMsg(""), 4000)
  }

  const eligibleCount = pending.filter(meetsVerificationRequirements).length

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <div className="flex-1">
          <p className="text-sm font-black">Account Verification</p>
          <p className="text-[11px] text-muted-foreground">{pending.length} pending review</p>
        </div>
        <button onClick={load} disabled={loading} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {msg && (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-[12px] text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />{msg}
          </div>
        )}

        {/* أدوات القبول الجماعي والتلقائي */}
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 space-y-3">
          <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Bulk Actions</p>

          <button onClick={handleAutoApproveAll} disabled={bulkBusy || eligibleCount === 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-400 py-3 text-sm font-bold text-black disabled:opacity-40 active:scale-95">
            {bulkBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            Auto-Approve All Eligible ({eligibleCount})
          </button>

          <button onClick={handleBulkApprove} disabled={bulkBusy || selected.size === 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-card py-3 text-sm font-bold text-amber-400 disabled:opacity-40 active:scale-95">
            <CheckCircle2 className="h-4 w-4" />Approve Selected ({selected.size})
          </button>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <strong>Auto-Approve</strong> only approves accounts that already meet their role's requirements (e.g. store name set). <strong>Approve Selected</strong> manually approves whichever accounts you check below, regardless of completeness.
          </p>
        </div>

        {/* بلاغات المحتوى — إشراف */}
        {reports.length > 0 && (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-4 space-y-2.5">
            <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5"><Flag className="h-3.5 w-3.5" />Content Reports ({reports.length})</p>
            {reports.map(r => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <p className="text-[12px] font-bold capitalize">{r.target_type} · {r.reason}</p>
                {r.description && <p className="text-[11px] text-muted-foreground">{r.description}</p>}
                <p className="text-[10px] text-muted-foreground font-mono">ID: {r.target_id}</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => resolveReport(r, "actioned", true)} className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-[11px] font-bold text-white"><Trash2 className="h-3 w-3" />Remove content</button>
                  <button onClick={() => resolveReport(r, "actioned", false)} className="rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-black">Mark actioned</button>
                  <button onClick={() => resolveReport(r, "dismissed")} className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold text-muted-foreground">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* طلبات سحب الرصيد — الأدمن يرسل Pi A2U ثم يسجّل رقم المعاملة */}
        {payouts.length > 0 && (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4 space-y-2.5">
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5"><CheckCheck className="h-3.5 w-3.5" />Withdrawal Requests ({payouts.length})</p>
            {payouts.map(w => (
              <div key={w.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <p className="text-[13px] font-bold">{w.amount}π</p>
                <p className="text-[10px] text-muted-foreground font-mono">Pi UID: {w.pi_uid || "—"} · user {w.user_id}</p>
                <div className="flex gap-2">
                  <button onClick={() => payWithdrawal(w)} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white">Mark paid (A2U)</button>
                  <button onClick={() => rejectWithdrawal(w)} className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-bold text-muted-foreground">Reject &amp; refund</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* قائمة الحسابات قيد المراجعة */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <ShieldCheck className="h-10 w-10 text-emerald-400/40" />
            <p className="text-sm font-bold">All caught up!</p>
            <p className="text-[12px] text-muted-foreground">No accounts pending review</p>
          </div>
        ) : (
          pending.map(u => {
            const RoleIcon = ROLE_ICON[u.role ?? ""] ?? Users
            const rule = VERIFICATION_REQUIREMENTS[u.role ?? "buyer"]
            const meets = meetsVerificationRequirements(u)
            const isBusy = busyId === u.id

            return (
              <div key={u.id} className={`rounded-2xl border bg-card p-4 space-y-3 ${meets ? "border-emerald-400/30" : "border-border"}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleSelect(u.id!)}
                    className={`flex h-5 w-5 shrink-0 mt-0.5 items-center justify-center rounded-md border-2 transition-colors ${selected.has(u.id!) ? "bg-amber-400 border-amber-400" : "border-border"}`}>
                    {selected.has(u.id!) && <CheckCircle2 className="h-3.5 w-3.5 text-black" />}
                  </button>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary"><RoleIcon className="h-5 w-5 text-muted-foreground" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{u.username}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{u.emall}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold capitalize bg-secondary px-2 py-0.5 rounded-full">{u.role?.replace("_"," ")}</span>
                    {meets && <span className="inline-block mt-1 ml-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">✓ Requirements met</span>}
                  </div>
                </div>

                {/* الحقول الناقصة */}
                {!meets && (rule?.requiredFields.length ?? 0) > 0 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Missing: {rule!.requiredFields.filter(f => !(u as any)[f]).join(", ")}
                  </div>
                )}

                {/* إشارة تلقائية: مطابقة نطاق البريد بنطاق الموقع — تساعدك تكشف
                    انتحال اسم شركة/مصنع بسرعة دون فتح أي وثيقة */}
                {(["merchant","agent","service_provider","company","factory","partner"].includes(u.role ?? "")) && (() => {
                  const sig = getBusinessEmailSignal(u)
                  if (sig.domainVerified) return (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />Email domain matches website ({sig.emailDomain})
                    </div>
                  )
                  if (sig.genericProvider) return (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                      <XCircle className="h-3.5 w-3.5 shrink-0" />Generic email provider ({sig.emailDomain}) — verify identity manually
                    </div>
                  )
                  return null
                })()}

                <div className="flex gap-2">
                  <button onClick={() => handleApprove(u.id!)} disabled={isBusy}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-400 py-2.5 text-[12px] font-bold text-black disabled:opacity-40 active:scale-95">
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Approve
                  </button>
                  <button onClick={() => handleReject(u.id!)} disabled={isBusy}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-red-400/30 bg-red-400/5 py-2.5 text-[12px] font-bold text-red-400 disabled:opacity-40 active:scale-95">
                    <XCircle className="h-3.5 w-3.5" />Reject
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
