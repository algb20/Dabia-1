"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUserAuth } from "@/hooks/use-user-auth"
import { deleteAccount } from "@/lib/dabia/db"
import { useTranslation, LANGUAGES } from "@/hooks/use-translation"
import { X, Moon, Sun, Bell, Lock, LogOut, Globe, ChevronRight, Save, Loader2 } from "lucide-react"
import OfficialSocialLinks from "@/components/official-social-links"

export default function SettingsPage() {
  const router = useRouter()
  const { user, logout, updateProfile } = useUserAuth()
  const { lang, setLang, translating } = useTranslation()
  const [theme,  setTheme]  = useState("dark")
  const [notifs, setNotifs] = useState(true)
  const [search, setSearch] = useState("")
  const [showLangModal, setShowLangModal] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showEmailPublic, setShowEmailPublic] = useState(false)

  useEffect(() => {
    setTheme(localStorage.getItem("dabia_theme") || "dark")
    setNotifs(localStorage.getItem("dabia_notifs") !== "false")
    setShowEmailPublic(localStorage.getItem("dabia_email_public") === "true")
  }, [])

  const applyTheme = (t: string) => {
    setTheme(t)
    localStorage.setItem("dabia_theme", t)
    if (t === "dark")  document.documentElement.classList.add("dark")
    if (t === "light") document.documentElement.classList.remove("dark")
    if (t === "system") {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches
      document.documentElement.classList.toggle("dark", dark)
    }
  }
  const toggleThemeQuick = () => applyTheme(theme === "dark" ? "light" : "dark")

  const handleSave = async () => {
    localStorage.setItem("dabia_notifs", String(notifs))
    localStorage.setItem("dabia_email_public", String(showEmailPublic))
    if (user) {
      await updateProfile({ profile: { ...(user.profile || {}), email_public: showEmailPublic } })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const filtered = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  )
  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0]

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95">
          <X className="h-4 w-4" />
        </button>
        <p className="text-sm font-black flex-1">Settings</p>
        <button onClick={handleSave}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all active:scale-95 ${saved ? "bg-emerald-400 text-black" : "bg-amber-400 text-black"}`}>
          <Save className="h-3.5 w-3.5" />
          {saved ? "Saved!" : "Save"}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">

        {/* Account */}
        {user && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Account</p>
            <p className="text-sm font-bold">{user.username}</p>
            <p className="text-[11px] text-muted-foreground">{user.emall}</p>
            <div className="flex gap-1.5 mt-1">
              <span className="text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-full px-2 py-0.5 capitalize font-semibold">{user.role}</span>
              <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${
                user.status === "active" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" : "bg-yellow-400/10 text-yellow-400 border border-yellow-400/20"
              }`}>{user.status === "pending" ? "⏳ Under Review" : "✓ " + user.status}</span>
            </div>
          </div>
        )}

        {/* Language + Theme quick toggle — بجانب بعض كما طُلب */}
        <div className="flex gap-2">
          <button onClick={() => setShowLangModal(true)}
            className="flex-1 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 active:scale-[0.98] transition-transform">
            <Globe className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-bold flex-1 text-left">Language</p>
            {translating && <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />}
            <span className="text-[12px] font-semibold text-muted-foreground">{currentLang.flag} {currentLang.name}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={toggleThemeQuick} title="Toggle dark / light"
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-border bg-card active:scale-95 transition-transform">
            {theme === "dark" ? <Moon className="h-5 w-5 text-amber-400" /> : <Sun className="h-5 w-5 text-amber-400" />}
          </button>
        </div>

        {showLangModal && (
          <div className="fixed inset-0 z-50 flex flex-col bg-background">
            <header className="sticky top-0 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
              <button onClick={() => { setShowLangModal(false); setSearch("") }} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
              <p className="text-sm font-black flex-1">Select Language</p>
              {translating && <span className="text-[11px] text-amber-400">Translating…</span>}
            </header>
            <div className="px-4 py-3 border-b border-border">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} autoFocus
                placeholder="Search language..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map(l => (
                <button key={l.code}
                  onClick={() => { setLang(l.code); setSearch(""); setShowLangModal(false) }}
                  className={`flex w-full items-center gap-3 px-4 py-3 border-b border-border/30 transition-colors ${
                    lang === l.code ? "bg-amber-400/10" : "hover:bg-secondary active:bg-secondary/70"
                  }`}>
                  <span className="text-xl leading-none">{l.flag}</span>
                  <div className="flex-1 text-left">
                    <p className="text-[13px] font-semibold">{l.name}</p>
                    <p className="text-[10px] text-muted-foreground">{l.code.toUpperCase()}</p>
                  </div>
                  {(l as any).rtl && <span className="text-[9px] border border-border rounded px-1 text-muted-foreground">RTL</span>}
                  {lang === l.code && <span className="text-amber-400 font-bold">✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Theme */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-4 w-4 text-amber-400" /> : <Sun className="h-4 w-4 text-amber-400" />}
            <p className="text-sm font-bold">Theme</p>
          </div>
          <div className="flex gap-2">
            {[{v:"light",l:"☀️ Light"},{v:"dark",l:"🌙 Dark"},{v:"system",l:"⚙️ System"}].map(t => (
              <button key={t.v} onClick={() => applyTheme(t.v)}
                className={`flex-1 rounded-xl border py-2.5 text-[12px] font-semibold transition-colors active:scale-95 ${
                  theme === t.v ? "border-amber-400 bg-amber-400/10 text-amber-400" : "border-border hover:bg-secondary"
                }`}>
                {t.l}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-bold">Notifications</p>
            </div>
            <button onClick={() => setNotifs(!notifs)}
              className={`relative h-6 w-11 rounded-full transition-colors ${notifs ? "bg-amber-400" : "bg-border"}`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${notifs ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">{notifs ? "✓ Enabled" : "✗ Disabled"}</p>
        </div>

        {/* Privacy — معيار أساسي بالتطبيقات العالمية المشابهة */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-bold">Privacy</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold">Show email to other users</p>
              <p className="text-[10px] text-muted-foreground">Merchants may need this for support</p>
            </div>
            <button onClick={() => setShowEmailPublic(!showEmailPublic)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${showEmailPublic ? "bg-amber-400" : "bg-border"}`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${showEmailPublic ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
        </div>

        {/* Legal */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {[{href:"/forgot-password",label:"Forgot Password?"},{href:"/terms",label:"Terms & Conditions"},{href:"/privacy",label:"Privacy Policy"}].map((item,i) => (
            <Link key={item.href} href={item.href}>
              <button className={`flex w-full items-center gap-3 px-4 py-3.5 hover:bg-secondary transition-colors ${i<2?"border-b border-border":""}`}>
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium text-left">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </Link>
          ))}
        </div>

        {/* Logout */}
        {user && (
          <button onClick={() => { logout(); router.push("/") }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/5 py-3.5 text-sm font-bold text-red-400 active:scale-95 transition-transform">
            <LogOut className="h-4 w-4" />Sign Out
          </button>
        )}

        {/* Delete Account — تأكيد مزدوج لمنع الحذف بالخطأ */}
        {user && (
          <button onClick={async () => {
            if (!confirm("This will permanently delete your account and all your data. This cannot be undone. Continue?")) return
            if (!confirm("Are you absolutely sure? Type nothing needed — just confirm to permanently delete.")) return
            setDeletingAccount(true)
            const ok = await deleteAccount(user.id!)
            setDeletingAccount(false)
            if (ok) { logout(); router.push("/") }
            else alert("Failed to delete account. Please try again or contact support.")
          }} disabled={deletingAccount}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-border py-3 text-[12px] font-semibold text-muted-foreground disabled:opacity-40 active:scale-95">
            {deletingAccount ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Deleting…</> : "Delete Account Permanently"}
          </button>
        )}

        <OfficialSocialLinks />

        <p className="text-center text-[10px] text-muted-foreground">Dabia v3.0 · Pi Network</p>
      </div>
    </div>
  )
}
