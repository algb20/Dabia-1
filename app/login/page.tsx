"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUserAuth } from "@/hooks/use-user-auth"
import { usePiNetworkAuthentication } from "@/hooks/use-pi-network-authentication"
import { getUserByPiUid } from "@/lib/dabia/db"
import { X, Mail, Lock, Loader2, AlertCircle, ArrowRight, Eye, EyeOff, CheckCircle2 } from "lucide-react"

export default function LoginPage() {
  useDabiaTranslation() // يُفعِّل ترجمة هذه الصفحة الفرعية عند فتحها بأي لغة مختارة
  const router = useRouter()
  const { login, loginWithPi } = useUserAuth()
  const { piUser } = usePiNetworkAuthentication()
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [piLoading, setPiLoading] = useState(false)
  const [error,    setError]    = useState("")

  const handlePiLogin = async () => {
    setPiLoading(true); setError("")
    try {
      await loginWithPi()
      router.replace("/")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pi sign-in failed")
    } finally {
      setPiLoading(false)
    }
  }

  // كشف تلقائي: إن كانت Dabia مفتوحة من داخل Pi Browser، تحقق فوراً إن كان
  // هذا المستخدم مسجّلاً مسبقاً بهوية Pi هذه — لا نخمّن، نسأل قاعدة البيانات
  const [piMatch, setPiMatch] = useState<"checking" | "found" | "new" | "none">("none")
  useEffect(() => {
    if (!piUser?.uid) return
    setPiMatch("checking")
    getUserByPiUid(piUser.uid).then(u => setPiMatch(u ? "found" : "new"))
  }, [piUser?.uid])

  const handleLogin = async () => {
    if (!email || !password) { setError("Please enter your email and password"); return }
    setLoading(true); setError("")
    try {
      await login(email, password)
      router.replace("/")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <div><p className="text-sm font-black">Welcome Back</p><p className="text-[11px] text-muted-foreground">Sign in to your account</p></div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-8">
        {piMatch === "found" && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-[12px] text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" /><span>Welcome back, @{piUser?.username} — enter your password to continue</span>
          </div>
        )}
        {piMatch === "new" && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2.5 text-[12px] text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>No Dabia account linked to @{piUser?.username} yet. <Link href="/register" className="font-bold underline">Create one</Link></span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-[12px] text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}

        {/* الطريقة الأسهل: دخول/تسجيل بنقرة واحدة عبر Pi Network (بلا بريد/كلمة سر) */}
        <button onClick={handlePiLogin} disabled={piLoading}
          className="w-full rounded-2xl bg-[#7d3cff] py-3.5 text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 shadow-[0_4px_14px_rgba(125,60,255,0.35)]">
          {piLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Connecting to Pi…</> : <>Continue with Pi Network<ArrowRight className="h-4 w-4" /></>}
        </button>
        <p className="text-center text-[10px] text-muted-foreground -mt-1">One tap inside Pi Browser — no email or password needed</p>

        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground">or use email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-muted-foreground">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-muted-foreground">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password"
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              className="w-full rounded-xl border border-border bg-background pl-9 pr-10 py-2.5 text-sm outline-none focus:border-amber-400/50" />
            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-[12px]">
          <Link href="/find-account" className="font-semibold text-muted-foreground">Find my account</Link>
          <Link href="/forgot-password" className="font-semibold text-amber-400">Forgot password?</Link>
        </div>

        <button onClick={handleLogin} disabled={loading}
          className="w-full rounded-2xl bg-amber-400 py-3.5 text-sm font-bold text-black disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</> : "Sign In"}
        </button>

        <div className="flex items-center gap-2 py-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Link href="/register">
          <button className="w-full rounded-2xl border border-border py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-95">
            Create New Account<ArrowRight className="h-4 w-4" />
          </button>
        </Link>
      </div>
    </div>
  )
}
