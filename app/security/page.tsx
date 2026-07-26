"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUserAuth } from "@/hooks/use-user-auth"
import { changePassword, deleteAccount } from "@/lib/dabia/db"
import { X, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ShieldCheck, LogOut, Trash2 } from "lucide-react"

export default function SecurityPage() {
  useDabiaTranslation()
  const router = useRouter()
  const { user, logout } = useUserAuth()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!user) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <button onClick={() => router.push("/register")} className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black">Sign In</button>
    </div>
  )

  const handleChangePassword = async () => {
    setError(""); setSuccess(false)
    if (!current || !next) { setError("Fill in all fields"); return }
    if (next !== confirm) { setError("New passwords do not match"); return }
    if (next.length < 6) { setError("New password must be at least 6 characters"); return }
    setSaving(true)
    const res = await changePassword(user.id!, current, next)
    setSaving(false)
    if (res.ok) {
      setSuccess(true); setCurrent(""); setNext(""); setConfirm("")
      setTimeout(() => setSuccess(false), 3000)
    } else {
      setError(res.error || "Failed to change password")
    }
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm("This will permanently delete your account, products, and all data. This cannot be undone. Continue?")) return
    setDeleting(true)
    const ok = await deleteAccount(user.id!)
    setDeleting(false)
    if (ok) { logout() } else { setError("Failed to delete account") }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black flex-1">Security</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {/* تغيير كلمة السر — حقيقي، يتحقق من الحالية أولاً */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-bold flex items-center gap-2"><Lock className="h-4 w-4 text-amber-400" />Change Password</p>

          {error && <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-[12px] text-red-400"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}
          {success && <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-[12px] text-emerald-400"><CheckCircle2 className="h-4 w-4 shrink-0" /><span>Password updated successfully</span></div>}

          <div className="relative">
            <input type={showCurrent ? "text" : "password"} value={current} onChange={e => setCurrent(e.target.value)} placeholder="Current password"
              className="w-full rounded-xl input-field px-3 py-2.5 pr-10 text-sm" />
            <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <input type={showNext ? "text" : "password"} value={next} onChange={e => setNext(e.target.value)} placeholder="New password (min 6 characters)"
              className="w-full rounded-xl input-field px-3 py-2.5 pr-10 text-sm" />
            <button type="button" onClick={() => setShowNext(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <input type={showNext ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password"
            className="w-full rounded-xl input-field px-3 py-2.5 text-sm" />

          <button onClick={handleChangePassword} disabled={saving} className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-400 py-3 text-sm font-bold text-black disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
          </button>
        </div>

        {/* معلومات الحساب الأمنية */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-bold flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" />Account Verification</p>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Email</span>
            <span className="font-semibold">{user.emall}</span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Pi Network ID</span>
            <span className="font-semibold">{user.pi_uid ? "✓ Linked" : "Not linked"}</span>
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Account Status</span>
            <span className={`font-semibold ${user.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>{user.status === "active" ? "Active" : "Pending review"}</span>
          </div>
        </div>

        {/* تسجيل الخروج */}
        <button onClick={() => logout()} className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-bold">
          <LogOut className="h-4 w-4" />Sign Out
        </button>

        {/* حذف الحساب */}
        <button onClick={handleDeleteAccount} disabled={deleting} className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/5 py-3 text-sm font-bold text-red-400 disabled:opacity-50">
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Delete Account Permanently
        </button>
      </div>
    </div>
  )
}
