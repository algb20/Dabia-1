"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { sendPasswordResetCode, resetPasswordWithCode } from "@/lib/dabia/db"
import { X, Mail, Lock, ShieldCheck, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react"

export default function ForgotPasswordPage() {
  useDabiaTranslation() // يُفعِّل ترجمة هذه الصفحة الفرعية عند فتحها بأي لغة مختارة
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<"email" | "code" | "done">("email")
  const [email, setEmail] = useState("")

  // Pre-fill email from query param (e.g. from find-account page)
  useEffect(() => {
    const e = searchParams.get("email")
    if (e) {
      setEmail(decodeURIComponent(e))
      // If email looks complete (not masked), skip straight to sending the code
    }
  }, [searchParams])
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [sentMsg, setSentMsg] = useState("")

  const handleSendCode = async () => {
    if (!email) { setError("Please enter your email"); return }
    setLoading(true); setError(""); setSentMsg("")
    const res = await sendPasswordResetCode(email)
    setLoading(false)
    if (res.ok) { setSentMsg("✓ Reset code sent to your email"); setStep("code") }
    else setError(res.error || "Failed to send code")
  }

  const handleResetPassword = async () => {
    if (!code || code.length < 4) { setError("Enter the code sent to your email"); return }
    if (!newPassword || newPassword.length < 6) { setError("Password must be at least 6 characters"); return }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return }
    setLoading(true); setError("")
    const res = await resetPasswordWithCode(email, code, newPassword)
    setLoading(false)
    if (res.ok) setStep("done")
    else setError(res.error || "Invalid or expired code")
  }

  // ── DONE ─────────────────────────────────────────────────────────────────
  if (step === "done") return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background gap-4 px-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-400/10">
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
      </div>
      <h2 className="text-xl font-black">Password Updated!</h2>
      <p className="text-sm text-muted-foreground text-center">You can now sign in with your new password.</p>
      <button onClick={() => router.push("/")} className="w-full max-w-sm rounded-2xl bg-amber-400 py-3.5 text-sm font-bold text-black active:scale-95 transition-transform">
        Back to Dabia →
      </button>
    </div>
  )

  // ── STEP 1: EMAIL ────────────────────────────────────────────────────────
  if (step === "email") return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <div><p className="text-sm font-black">Forgot Password</p><p className="text-[11px] text-muted-foreground">We'll send a reset code</p></div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[12px] text-muted-foreground">Enter the email you registered with on Dabia. We'll send a verification code to reset your password.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-[12px] text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-muted-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
          </div>
        </div>

        <button onClick={handleSendCode} disabled={loading}
          className="w-full rounded-2xl bg-amber-400 py-3.5 text-sm font-bold text-black disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</> : "Send Reset Code"}
        </button>
      </div>
    </div>
  )

  // ── STEP 2: CODE + NEW PASSWORD ──────────────────────────────────────────
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => setStep("email")} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <div><p className="text-sm font-black">Reset Password</p><p className="text-[11px] text-muted-foreground">{email}</p></div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-8">
        {sentMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-[12px] text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" /><span>{sentMsg}</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-[12px] text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-muted-foreground">Verification Code</label>
          <input type="text" inputMode="numeric" maxLength={8} value={code}
            onChange={e => setCode(e.target.value.replace(/[^0-9]/g, ""))} placeholder="• • • • • •"
            className="w-full rounded-xl border border-border bg-background px-4 py-4 text-center text-2xl font-black tracking-[0.3em] outline-none focus:border-amber-400/50" />
        </div>

        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-muted-foreground">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type={showPass ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters"
              className="w-full rounded-xl border border-border bg-background pl-9 pr-10 py-2.5 text-sm outline-none focus:border-amber-400/50" />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-muted-foreground">Confirm New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type={showPass ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password"
              className="w-full rounded-xl border border-border bg-background pl-9 pr-10 py-2.5 text-sm outline-none focus:border-amber-400/50" />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button onClick={handleResetPassword} disabled={loading}
          className="w-full rounded-2xl bg-amber-400 py-3.5 text-sm font-bold text-black disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Updating…</> : "✓ Reset Password"}
        </button>

        <button onClick={handleSendCode} disabled={loading} className="w-full rounded-xl border border-border py-3 text-[12px] font-semibold text-muted-foreground disabled:opacity-40 active:scale-95">
          Didn't receive it? Resend code
        </button>
      </div>
    </div>
  )
}
