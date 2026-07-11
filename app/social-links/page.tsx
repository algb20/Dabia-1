"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserAuth } from "@/hooks/use-user-auth"
import { X, Save, Send, Instagram, Twitter, Mail, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react"

type LinkKey = "telegram" | "instagram" | "x"

export default function SocialLinksPage() {
  useDabiaTranslation() // يُفعِّل ترجمة هذه الصفحة الفرعية عند فتحها بأي لغة مختارة
  const router = useRouter()
  const { user, updateProfile } = useUserAuth()

  const [telegram,  setTelegram]  = useState({ url: "", enabled: false })
  const [instagram, setInstagram] = useState({ url: "", enabled: false })
  const [x,         setX]         = useState({ url: "", enabled: false })
  const [emailPublic, setEmailPublic] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState("")

  useEffect(() => {
    if (!user?.social_links) return
    if (user.social_links.telegram)  setTelegram(user.social_links.telegram)
    if (user.social_links.instagram) setInstagram(user.social_links.instagram)
    if (user.social_links.x)         setX(user.social_links.x)
    if (user.social_links.email_public) setEmailPublic(!!user.social_links.email_public.enabled)
  }, [user])

  if (!user) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <button onClick={() => router.push("/register")} className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black">Sign In</button>
    </div>
  )

  const handleSave = async () => {
    setSaving(true); setError("")
    try {
      await updateProfile({
        social_links: {
          telegram, instagram, x,
          email_public: { enabled: emailPublic },
        },
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError("Failed to save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const links: { key: LinkKey; label: string; icon: any; placeholder: string; state: any; setState: any }[] = [
    { key: "telegram",  label: "Telegram",  icon: Send,      placeholder: "https://t.me/yourusername",   state: telegram,  setState: setTelegram },
    { key: "instagram", label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/you",    state: instagram, setState: setInstagram },
    { key: "x",         label: "X (Twitter)", icon: Twitter, placeholder: "https://x.com/you",            state: x,         setState: setX },
  ]

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black flex-1">Social Links</p>
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${saved ? "bg-emerald-400 text-black" : "bg-amber-400 text-black"}`}>
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving…" : saved ? "Saved!" : "Save"}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-10">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-[12px] text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}

        <p className="text-[12px] text-muted-foreground">Add your real links and choose exactly which ones show on your public identity card. Stored securely in your account — only you can edit these.</p>

        {links.map(({ key, label, icon: Icon, placeholder, state, setState }) => (
          <div key={key} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-amber-400" />
                <p className="text-sm font-bold">{label}</p>
              </div>
              <button onClick={() => setState((s: any) => ({ ...s, enabled: !s.enabled }))}
                className={`relative h-6 w-11 rounded-full transition-colors ${state.enabled ? "bg-amber-400" : "bg-border"}`}>
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${state.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
            <input
              type="url"
              value={state.url}
              onChange={e => setState((s: any) => ({ ...s, url: e.target.value }))}
              placeholder={placeholder}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50"
            />
            <p className="text-[10px] text-muted-foreground">
              {state.enabled ? "✓ Visible on your public profile" : "Hidden — toggle on to show this link"}
            </p>
          </div>
        ))}

        {/* خصوصية الإيميل — تحكم منفصل وصريح */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-bold">Show Email Publicly</p>
            </div>
            <button onClick={() => setEmailPublic(v => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${emailPublic ? "bg-amber-400" : "bg-border"}`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${emailPublic ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            {emailPublic ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {emailPublic ? "Your email is visible to other users" : "Your email stays private"}
          </p>
        </div>
      </div>
    </div>
  )
}
