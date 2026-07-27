"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useUserAuth } from "@/hooks/use-user-auth"
import { listDMThreads, type DBDMThread } from "@/lib/dabia/db"
import { X, Loader2, MessageCircle, BadgeCheck, Crown } from "lucide-react"

function timeAgo(iso?: string | null) {
  if (!iso) return ""
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "now"
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export default function MessagesPage() {
  useDabiaTranslation()
  const router = useRouter()
  const { user } = useUserAuth()
  const [threads, setThreads] = useState<DBDMThread[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!user?.id) { setLoading(false); return }
    listDMThreads(user.id).then(setThreads).finally(() => setLoading(false))
  }, [user?.id])
  useEffect(() => { load() }, [load])
  // تحديث خفيف كل ٥ ثوانٍ لصندوق الوارد
  useEffect(() => {
    if (!user?.id) return
    const t = setInterval(load, 5000)
    return () => clearInterval(t)
  }, [user?.id, load])

  if (!user) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <button onClick={() => router.push("/register")} className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black">Sign In</button>
    </div>
  )

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black flex-1">Messages</p>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center px-6">
            <MessageCircle className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-bold">No conversations yet</p>
            <p className="text-[12px] text-muted-foreground">Open a seller or member's profile and tap Message to start chatting.</p>
          </div>
        ) : threads.map(t => (
          <button key={t.thread_id} onClick={() => router.push(`/messages/${t.thread_id}`)}
            className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left active:bg-secondary/40">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-[13px] font-bold overflow-hidden">
              {t.other_avatar ? <img src={t.other_avatar} alt="" className="h-full w-full object-cover" /> : (t.other_username || "U")[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-bold truncate">{t.other_username}</p>
                {t.other_account_type === "official" ? <BadgeCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  : t.other_account_type === "premium" ? <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" /> : null}
                <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{timeAgo(t.last_at)}</span>
              </div>
              <p className={`text-[12px] truncate ${t.unread ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                {t.last_sender && String(t.last_sender) === String(user.id) ? "You: " : ""}{t.last_text || "Say hello 👋"}
              </p>
            </div>
            {t.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />}
          </button>
        ))}
      </div>
    </div>
  )
}
