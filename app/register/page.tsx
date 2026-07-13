"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUserAuth } from "@/hooks/use-user-auth"
import { usePiNetworkAuthentication } from "@/hooks/use-pi-network-authentication"
import { sendVerificationCode, verifyEmailCode } from "@/lib/dabia/db"
import { COUNTRIES } from "@/lib/countries"
import {
  User, Store, Building, Factory, Handshake, Briefcase, Users,
  ChevronRight, X, CheckCircle2, Loader2, AlertCircle,
  Globe, Phone, Mail, Lock, Clock, ShieldCheck, Eye, EyeOff
} from "lucide-react"

type AT = "buyer"|"merchant"|"company"|"factory"|"agent"|"service_provider"|"partner"

const TYPES = [
  { type:"buyer"            as AT, label:"Buyer / User",           icon:User,      color:"border-blue-400/30   bg-blue-400/5",     desc:"Browse and buy" },
  { type:"merchant"         as AT, label:"Merchant / Seller",      icon:Store,     color:"border-amber-400/30  bg-amber-400/5",    desc:"Sell products" },
  { type:"company"          as AT, label:"Company",                icon:Building,  color:"border-purple-400/30 bg-purple-400/5",   desc:"Corporate account" },
  { type:"factory"          as AT, label:"Factory",                icon:Factory,   color:"border-emerald-400/30 bg-emerald-400/5", desc:"Manufacturing" },
  { type:"agent"            as AT, label:"Agent / Distributor",    icon:Handshake, color:"border-cyan-400/30   bg-cyan-400/5",     desc:"Distribution" },
  { type:"service_provider" as AT, label:"Service Provider",       icon:Briefcase, color:"border-rose-400/30   bg-rose-400/5",     desc:"Services" },
  { type:"partner"          as AT, label:"Strategic Partner",      icon:Users,     color:"border-indigo-400/30 bg-indigo-400/5",   desc:"Partnership" },
]

export default function RegisterPage() {
  useDabiaTranslation() // يُفعِّل ترجمة هذه الصفحة الفرعية عند فتحها بأي لغة مختارة
  const router = useRouter()
  const { register, loginWithPi } = useUserAuth()
  const { piUser }   = usePiNetworkAuthentication()

  const [piLoading, setPiLoading] = useState(false)
  const handlePiQuickJoin = async () => {
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

  const [step,         setStep]         = useState<"type"|"details"|"verify"|"terms"|"done">("type")
  const [selected,     setSelected]     = useState<AT | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState("")
  const [agreeTerms,   setAgreeTerms]   = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // ── حالة تأكيد البريد ─────────────────────────────────────────────────────
  const [otpCode,      setOtpCode]      = useState("")
  const [otpSending,   setOtpSending]   = useState(false)
  const [otpVerifying, setOtpVerifying] = useState(false)
  const [otpVerified,  setOtpVerified]  = useState(false)
  const [otpError,     setOtpError]     = useState("")
  const [otpSentMsg,   setOtpSentMsg]   = useState("")

  const [form, setForm] = useState({
    email:"", password:"", phone:"", country:"",
    storeName:"", website:"", linkedin:"", instagram:"", twitter:"", telegram:"",
  })

  // ── بحث/اقتراحات الدولة ───────────────────────────────────────────────────
  const [countryOpen, setCountryOpen] = useState(false)
  const countryMatches = form.country.trim()
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(form.country.trim().toLowerCase())).slice(0, 8)
    : COUNTRIES.slice(0, 8)

  const cfg = TYPES.find(t => t.type === selected)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  // ── إرسال رمز التحقق للبريد ────────────────────────────────────────────────
  const handleSendCode = async () => {
    setOtpSending(true); setOtpError(""); setOtpSentMsg("")
    const res = await sendVerificationCode(form.email)
    setOtpSending(false)
    if (res.ok) setOtpSentMsg("✓ Verification code sent to your email")
    else setOtpError(res.error || "Failed to send code")
  }

  // ── التحقق من الرمز المُدخل ───────────────────────────────────────────────
  const handleVerifyCode = async () => {
    if (!otpCode || otpCode.length < 4) { setOtpError("Enter the code sent to your email"); return }
    setOtpVerifying(true); setOtpError("")
    const res = await verifyEmailCode(form.email, otpCode)
    setOtpVerifying(false)
    if (res.ok) { setOtpVerified(true); setOtpError(""); setStep("terms") }
    else setOtpError(res.error || "Invalid code, please try again")
  }

  const handleRegister = async () => {
    if (!agreeTerms || !agreePrivacy) { setError("Please agree to Terms and Privacy Policy"); return }
    if (!form.email)    { setError("Email is required"); return }
    if (!form.password) { setError("Password is required"); return }
    if (!otpVerified)   { setError("Please verify your email first"); return }
    setLoading(true); setError("")
    try {
      await register(form.email, selected!, {
        password: form.password, phone: form.phone, country: form.country,
        storeName: form.storeName, website: form.website,
        socialLinks: { linkedin: form.linkedin, instagram: form.instagram, twitter: form.twitter, telegram: form.telegram },
      }, piUser ? { uid: piUser.uid, username: piUser.username } : undefined)
      setStep("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed. Please try again.")
    } finally { setLoading(false) }
  }

  // ── DONE ─────────────────────────────────────────────────────────────────
  if (step === "done") {
    const isPending = selected !== "buyer"
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background gap-5 px-6">
        <div className={`flex h-20 w-20 items-center justify-center rounded-3xl border ${isPending ? "border-amber-400/20 bg-amber-400/10" : "border-emerald-400/20 bg-emerald-400/10"}`}>
          {isPending ? <Clock className="h-10 w-10 text-amber-400" /> : <CheckCircle2 className="h-10 w-10 text-emerald-400" />}
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-black">{isPending ? "Application Submitted! 📋" : "Welcome to Dabia! 🎉"}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
            {isPending ? `Your ${selected?.replace("_"," ")} account has been submitted. We'll review within 24–48 hours.` : "You can now browse and buy with Pi."}
          </p>
        </div>
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">✓ Saved Successfully</p>
          <div className="space-y-1.5 text-[12px]">
            {piUser && <div className="flex justify-between"><span className="text-muted-foreground">Pi Username</span><span className="font-bold text-amber-400">@{piUser.username}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-bold truncate max-w-[180px]">{form.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Account Type</span><span className="font-bold capitalize">{selected?.replace("_"," ")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`font-bold ${isPending ? "text-amber-400" : "text-emerald-400"}`}>{isPending ? "Under Review" : "Active"}</span></div>
            {form.phone   && <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-bold">{form.phone}</span></div>}
            {form.country && <div className="flex justify-between"><span className="text-muted-foreground">Country</span><span className="font-bold">{form.country}</span></div>}
          </div>
        </div>
        {isPending && (
          <div className="w-full max-w-sm rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
            <p className="text-[11px] font-bold text-amber-400">What happens next?</p>
            <p className="text-[11px] text-muted-foreground mt-1">Our team reviews your account within 24–48 hours. You'll be notified once approved.</p>
          </div>
        )}
        <button onClick={() => router.replace("/")} className="w-full max-w-sm rounded-2xl bg-amber-400 py-3.5 text-sm font-bold text-black active:scale-95 transition-transform">
          Go to Dabia →
        </button>
      </div>
    )
  }

  // ── SELECT TYPE ───────────────────────────────────────────────────────────
  if (step === "type") return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <div>
          <p className="text-sm font-black">Join Dabia</p>
          <p className="text-[11px] text-muted-foreground">{piUser ? `Pi: @${piUser.username}` : "Select account type"}</p>
        </div>
      </header>
      {piUser && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <p className="text-[12px] text-amber-400 font-semibold">Connected as @{piUser.username}</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 pb-20">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-[12px] text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}
        {/* أسرع طريق للتسوّق: انضمام بنقرة واحدة عبر Pi (حساب مشترٍ فوري بلا نموذج) */}
        <button onClick={handlePiQuickJoin} disabled={piLoading}
          className="w-full rounded-2xl bg-[#7d3cff] py-3.5 text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 shadow-[0_4px_14px_rgba(125,60,255,0.35)]">
          {piLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Connecting to Pi…</> : <>Continue with Pi — start shopping<ChevronRight className="h-4 w-4" /></>}
        </button>
        <p className="text-center text-[10px] text-muted-foreground">One tap inside Pi Browser · buy, save & comment right away · become a seller anytime</p>
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground">or pick an account type</span>
          <div className="flex-1 h-px bg-border" />
        </div>
        <p className="text-[12px] text-muted-foreground text-center pb-1">Choose your account type — upgrade anytime</p>
        <div className="flex items-center justify-center gap-1.5 pb-2 text-[12px]">
          <span className="text-muted-foreground">Already have an account?</span>
          <Link href="/login" className="font-bold text-amber-400">Sign In</Link>
        </div>
        {TYPES.map(at => {
          const Icon = at.icon
          return (
            <button key={at.type} onClick={() => { setSelected(at.type); setStep("details") }}
              className={`w-full flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition-all active:scale-[0.98] ${at.color}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/60"><Icon className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{at.label}</p>
                <p className="text-[11px] text-muted-foreground">{at.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )

  // ── DETAILS ───────────────────────────────────────────────────────────────
  if (step === "details" && cfg) return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => setStep("type")} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <div><p className="text-sm font-black">{cfg.label}</p><p className="text-[11px] text-muted-foreground">Complete your profile</p></div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {piUser && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Pi Username (auto)</p>
            <p className="text-sm font-bold mt-0.5">@{piUser.username}</p>
          </div>
        )}
        {[
          { k:"email",    label:"Email *",    icon:<Mail  className="h-4 w-4 text-muted-foreground" />, type:"email",    ph:"you@example.com" },
          { k:"password", label:"Password *", icon:<Lock  className="h-4 w-4 text-muted-foreground" />, type:"password", ph:"Min 8 characters" },
          { k:"phone",    label:"Phone",      icon:<Phone className="h-4 w-4 text-muted-foreground" />, type:"tel",      ph:"+1 234 567 890" },
        ].map(f => (
          <div key={f.k} className="space-y-1">
            <label className="text-[12px] font-semibold text-muted-foreground">{f.label}</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">{f.icon}</div>
              <input type={f.k === "password" ? (showPassword ? "text" : "password") : f.type} value={(form as any)[f.k]} onChange={set(f.k)} placeholder={f.ph}
                className={`w-full rounded-xl border border-border bg-background pl-9 py-2.5 text-sm outline-none focus:border-amber-400/50 transition-colors ${f.k === "password" ? "pr-10" : "pr-3"}`} />
              {f.k === "password" && (
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* حقل الدولة — بحث واقتراحات من كل دول العالم */}
        <div className="space-y-1 relative">
          <label className="text-[12px] font-semibold text-muted-foreground">Country</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={form.country}
              onChange={e => { setForm(f => ({ ...f, country: e.target.value })); setCountryOpen(true) }}
              onFocus={() => setCountryOpen(true)}
              placeholder="Type to search your country…"
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:border-amber-400/50 transition-colors"
            />
          </div>
          {countryOpen && countryMatches.length > 0 && (
            <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
              {countryMatches.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { setForm(f => ({ ...f, country: c.name })); setCountryOpen(false) }}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-secondary transition-colors border-b border-border/30 last:border-0"
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="text-[13px]">{c.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {selected !== "buyer" && (
          <div className="space-y-1">
            <label className="text-[12px] font-semibold text-muted-foreground">
              {selected==="merchant"?"Store Name *":selected==="company"?"Company Name *":selected==="factory"?"Factory Name *":"Business Name *"}
            </label>
            <input type="text" value={form.storeName} onChange={set("storeName")} placeholder="Your business name"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
          </div>
        )}
        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-muted-foreground">Website (optional)</label>
          <input type="url" value={form.website} onChange={set("website")} placeholder="https://yoursite.com"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
        </div>
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground">Social Links (optional)</p>
          {[{k:"linkedin",ph:"LinkedIn"},{k:"instagram",ph:"Instagram"},{k:"twitter",ph:"X/Twitter"},{k:"telegram",ph:"Telegram"}].map(s => (
            <input key={s.k} type="text" value={(form as any)[s.k]} onChange={set(s.k)} placeholder={s.ph}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-amber-400/50" />
          ))}
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-[12px] text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}
        <button onClick={async () => {
          if (!form.email) { setError("Email required"); return }
          if (!form.password) { setError("Password required"); return }
          if (selected !== "buyer" && !form.storeName) { setError("Business name required"); return }
          setError("")
          setStep("verify")
          await handleSendCode()
        }} disabled={otpSending}
          className="w-full rounded-2xl bg-amber-400 py-3.5 text-sm font-bold text-black active:scale-95 transition-transform disabled:opacity-50">
          Next → Verify Email
        </button>
      </div>
    </div>
  )

  // ── VERIFY EMAIL ─────────────────────────────────────────────────────────────
  if (step === "verify") return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => setStep("details")} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <div><p className="text-sm font-black">Verify Your Email</p><p className="text-[11px] text-muted-foreground">Confirm it's really you</p></div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">

        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-[12px] font-bold">A verification code was sent to:</p>
            <p className="text-sm font-black text-amber-400 mt-0.5">{form.email}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Enter the code below to confirm this is your real email address.</p>
          </div>
        </div>

        {otpSentMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-[12px] text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" /><span>{otpSentMsg}</span>
          </div>
        )}
        {otpError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-[12px] text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /><span>{otpError}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-muted-foreground">Verification Code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            value={otpCode}
            onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="• • • • • •"
            className="w-full rounded-xl border border-border bg-background px-4 py-4 text-center text-2xl font-black tracking-[0.3em] outline-none focus:border-amber-400/50"
          />
        </div>

        <button onClick={handleVerifyCode} disabled={otpVerifying || otpCode.length < 4}
          className="w-full rounded-2xl bg-amber-400 py-3.5 text-sm font-bold text-black disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95">
          {otpVerifying ? <><Loader2 className="h-4 w-4 animate-spin" />Verifying…</> : "✓ Verify & Continue"}
        </button>

        <button onClick={handleSendCode} disabled={otpSending}
          className="w-full rounded-xl border border-border py-3 text-[12px] font-semibold text-muted-foreground disabled:opacity-40 active:scale-95">
          {otpSending ? "Sending…" : "Didn't receive it? Resend code"}
        </button>
      </div>
    </div>
  )

  // ── TERMS ─────────────────────────────────────────────────────────────────
  if (step === "terms") return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => setStep("verify")} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <div><p className="text-sm font-black">Review & Accept</p><p className="text-[11px] text-muted-foreground">Final step</p></div>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-28">
        {otpVerified && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-[12px] text-emerald-400">
            <ShieldCheck className="h-4 w-4 shrink-0" /><span>Email verified ✓</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-[12px] text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Summary</p>
          <div className="space-y-1.5 text-[12px]">
            {piUser && <div className="flex justify-between"><span className="text-muted-foreground">Pi</span><span className="font-bold text-amber-400">@{piUser.username}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="font-bold truncate max-w-[180px]">{form.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-bold capitalize">{selected?.replace("_"," ")}</span></div>
            {form.storeName && <div className="flex justify-between"><span className="text-muted-foreground">Business</span><span className="font-bold truncate max-w-[160px]">{form.storeName}</span></div>}
            {form.phone    && <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-bold">{form.phone}</span></div>}
            {form.country  && <div className="flex justify-between"><span className="text-muted-foreground">Country</span><span className="font-bold">{form.country}</span></div>}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-[12px] font-bold">📋 Terms & Conditions</p>
          <p className="text-[11px] text-muted-foreground">By registering you agree to our Terms of Service and take responsibility for all activity.</p>
          <Link href="/terms" className="text-[11px] text-amber-400 underline">Read full Terms →</Link>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-[12px] font-bold">🔒 Privacy Policy</p>
          <p className="text-[11px] text-muted-foreground">Your data is protected, and never sold to third parties.</p>
          <Link href="/privacy" className="text-[11px] text-amber-400 underline">Read Privacy →</Link>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-[12px] font-bold">🛡️ Marketplace &amp; Refunds</p>
          <p className="text-[11px] text-muted-foreground">Dabia connects buyers and sellers; each purchase is a direct contract with the seller. See how shipping, refunds and disputes work.</p>
          <Link href="/refund" className="text-[11px] text-amber-400 underline">Read Refund &amp; Shipping Policy →</Link>
        </div>
        <div className="space-y-2.5 pt-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} className="h-4 w-4 rounded" />
            <span className="text-[12px] text-muted-foreground">I agree to Terms & Conditions</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={agreePrivacy} onChange={e => setAgreePrivacy(e.target.checked)} className="h-4 w-4 rounded" />
            <span className="text-[12px] text-muted-foreground">I agree to Privacy Policy</span>
          </label>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur p-4">
        <button onClick={handleRegister} disabled={!agreeTerms || !agreePrivacy || loading}
          className="w-full rounded-2xl bg-amber-400 py-3.5 text-sm font-bold text-black disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Saving account…</> : "✓ Complete Registration"}
        </button>
      </div>
    </div>
  )

  return null
}
