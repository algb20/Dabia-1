"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUserAuth } from "@/hooks/use-user-auth"
import { X, Clock, CheckCircle2, AlertCircle, Building, Globe2, Loader2 } from "lucide-react"
import { getBusinessEmailSignal } from "@/lib/dabia/db"

export default function AccountVerificationPage() {
  useDabiaTranslation() // يُفعِّل ترجمة هذه الصفحة الفرعية عند فتحها بأي لغة مختارة
  const router = useRouter()
  const { user, updateProfile, verificationRule, meetsRequirements } = useUserAuth()
  const [storeName, setStoreName] = useState(user?.store_name || "")
  const [country,   setCountry]   = useState(user?.country   || "")
  const [saving,    setSaving]    = useState(false)
  const [done,      setDone]      = useState(false)

  if (!user) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <button onClick={() => router.push("/register")} className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black">Sign In</button>
    </div>
  )

  const isVerified = user.status === "active" || user.status === "verified"
  const needsStore   = verificationRule?.requiredFields.includes("store_name") && !user.store_name
  const needsCountry = verificationRule?.requiredFields.includes("country")    && !user.country
  const isEntityAccount = ["merchant","agent","service_provider","company","factory","partner"].includes(user.role || "")
  const emailSignal = getBusinessEmailSignal(user)

  const handleComplete = async () => {
    setSaving(true)
    await updateProfile({ store_name: storeName.trim() || undefined, country: country.trim() || undefined })
    setSaving(false)
    setDone(true)
    setTimeout(() => router.back(), 1500)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black">Account Verification</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">

        {/* Status card */}
        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${isVerified ? "border-emerald-400/20 bg-emerald-400/5" : "border-amber-400/20 bg-amber-400/5"}`}>
          {isVerified ? <CheckCircle2 className="h-9 w-9 text-emerald-400 shrink-0" /> : <Clock className="h-9 w-9 text-amber-400 shrink-0" />}
          <div>
            <p className="text-sm font-bold">{isVerified ? "Account Active ✓" : "Pending Verification"}</p>
            <p className="text-[11px] text-muted-foreground capitalize">{(user.role ?? "buyer").replace("_"," ")} account · {isVerified ? "All checks passed" : `Review window: ${verificationRule?.reviewWindowHours ?? 24}h`}</p>
          </div>
        </div>

        {/* هوية Pi Network — طبقة تحقق مستقلة عن مراجعة بيانات النشاط التجاري أدناه.
            Pi Network يتحقق من تفرّد الشخص (لا تكرار حسابات لنفس الهوية)، بينما
            المراجعة اليدوية أسفل تتحقق من معلومات النشاط التجاري نفسه. */}
        <div className={`rounded-xl border p-3 flex items-center gap-2.5 text-[12px] ${user.pi_uid ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-400" : "border-border text-muted-foreground"}`}>
          {user.pi_uid ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{user.pi_uid ? "Identity confirmed via Pi Network — one verified entity, no duplicate accounts" : "Not linked to a Pi Network identity yet — open Dabia from Pi Browser to link automatically"}</span>
        </div>

        {/* تحقق تلقائي خفيف من البريد التجاري — يقارن نطاق بريدك بنطاق موقعك
            المُدخل، دون أي وثائق أو تعقيد. لا يحجب الحساب أبداً، فقط يقوّي ملفك. */}
        {isEntityAccount && (
          <div className={`rounded-xl border p-3 flex items-start gap-2.5 text-[12px] ${
            emailSignal.domainVerified ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-400" : "border-border text-muted-foreground"
          }`}>
            {emailSignal.domainVerified ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <Globe2 className="h-4 w-4 shrink-0 mt-0.5" />}
            <div className="space-y-1">
              {emailSignal.domainVerified ? (
                <span>Business email matches your website domain — strong automatic ownership signal ({emailSignal.emailDomain})</span>
              ) : user.website_url ? (
                <span>Your email ({emailSignal.emailDomain ?? "—"}) doesn't match your website domain ({emailSignal.websiteDomain ?? "—"}) — not required, but matching it strengthens your profile</span>
              ) : (
                <span>Add your business website in your profile — if it matches your email's domain ({emailSignal.emailDomain ?? "your email"}), it automatically strengthens your verification</span>
              )}
              {emailSignal.domainVerified && (
                <p className="text-muted-foreground">When you submit below, we also automatically check the public web for your business — if confirmed, your account can be approved instantly without waiting for manual review.</p>
              )}
            </div>
          </div>
        )}

        {done && (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 flex items-center gap-2 text-[12px] text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />Information saved — re-checking your status…
          </div>
        )}

        {!isVerified && (
          <>
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <p className="text-[12px] font-bold">What's required for {(user.role ?? "buyer").replace("_"," ")}</p>
              <ul className="space-y-1.5">
                {(verificationRule?.requiredFields ?? []).map(f => (
                  <li key={f} className="flex items-center gap-2 text-[12px]">
                    {(user as any)[f] ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                    <span className={(user as any)[f] ? "text-muted-foreground line-through" : ""}>
                      {f === "store_name" ? "Business / Store name" : f === "country" ? "Country" : f}
                    </span>
                  </li>
                ))}
                {(verificationRule?.requiredFields.length ?? 0) === 0 && (
                  <li className="text-[12px] text-muted-foreground">No extra info needed — account activates automatically.</li>
                )}
              </ul>
            </div>

            {(needsStore || needsCountry) && (
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Complete Missing Info</p>
                {needsStore && (
                  <div className="space-y-1">
                    <label className="text-[12px] font-semibold flex items-center gap-1.5"><Building className="h-3.5 w-3.5 text-amber-400" />Business / Store Name</label>
                    <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Your business name"
                      className="input-field w-full rounded-xl px-3 py-2.5 text-sm" />
                  </div>
                )}
                {needsCountry && (
                  <div className="space-y-1">
                    <label className="text-[12px] font-semibold flex items-center gap-1.5"><Globe2 className="h-3.5 w-3.5 text-amber-400" />Country</label>
                    <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Your country"
                      className="input-field w-full rounded-xl px-3 py-2.5 text-sm" />
                  </div>
                )}
                <button onClick={handleComplete} disabled={saving}
                  className="w-full rounded-2xl bg-amber-400 py-3 text-sm font-bold text-black disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95">
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : "✓ Submit & Re-check"}
                </button>
              </div>
            )}

            {!needsStore && !needsCountry && (
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-[12px] text-amber-400">
                Your information is complete. Our team is finalizing manual review — you'll be notified once approved.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
