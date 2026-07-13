"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useUserAuth } from "@/hooks/use-user-auth"
import { getDMMessages, sendDM, markDMRead, listDMThreads, supabase, type DBDMMessage, type DBDMThread } from "@/lib/dabia/db"
import { X, Loader2, Send, BadgeCheck, Crown } from "lucide-react"

export default function ConversationPage() {
  useDabiaTranslation()
  const router = useRouter()
  const params = useParams()
  const threadId = params?.id as string
  const { user } = useUserAuth()

  const [messages, setMessages] = useState<DBDMMessage[]>([])
  const [other, setOther] = useState<DBDMThread | null>(null)
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const lastAtRef = useRef<string | undefined>(undefined)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50)

  // تحميل أولي + معرفة الطرف الآخر
  useEffect(() => {
    if (!user?.id || !threadId) return
    let active = true
    Promise.all([getDMMessages(threadId, user.id!), listDMThreads(user.id!)]).then(([msgs, threads]) => {
      if (!active) return
      setMessages(msgs)
      lastAtRef.current = msgs.length ? msgs[msgs.length - 1].created_at : undefined
      setOther(threads.find(t => String(t.thread_id) === String(threadId)) || null)
      setLoading(false)
      markDMRead(threadId, user.id!)
      scrollToBottom()
    })
    return () => { active = false }
  }, [user?.id, threadId])

  // دمج رسالة جديدة بلا تكرار + تعليم كمقروءة + تمرير لأسفل
  const ingest = useCallback((incoming: DBDMMessage[]) => {
    if (!incoming.length || !user?.id) return
    setMessages(prev => {
      const seen = new Set(prev.map(m => String(m.id)))
      const add = incoming.filter(m => !seen.has(String(m.id)))
      if (!add.length) return prev
      const merged = [...prev, ...add].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime())
      lastAtRef.current = merged[merged.length - 1].created_at
      return merged
    })
    markDMRead(threadId, user.id!)
    scrollToBottom()
  }, [user?.id, threadId])

  // الحل الدائم: بثّ لحظي خاص عبر Supabase Realtime — يصل الحدث للطرفين فقط
  // (سياسات RLS تمنع أي طرف ثالث). يعمل فوراً لمن لديه جلسة.
  useEffect(() => {
    if (!user?.id || !threadId) return
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false
    ;(async () => {
      // إرفاق رمز جلسة المستخدم بقناة Realtime حتى تسري سياسات RLS الخاصة
      try {
        const { data } = await supabase.auth.getSession()
        const token = data?.session?.access_token
        if (token) supabase.realtime.setAuth(token)
      } catch {}
      if (cancelled) return
      channel = supabase
        .channel(`dm-${threadId}`)
        .on("postgres_changes",
          { event: "INSERT", schema: "public", table: "dm_messages", filter: `thread_id=eq.${threadId}` },
          (payload: any) => { if (payload?.new) ingest([payload.new as DBDMMessage]) })
        .subscribe()
    })()
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel) }
  }, [user?.id, threadId, ingest])

  // استطلاع احتياطي كل ٦ ثوانٍ (يغطّي من لا جلسة له أو أي حدث فائت)
  useEffect(() => {
    if (!user?.id || !threadId) return
    const poll = setInterval(async () => {
      const fresh = await getDMMessages(threadId, user.id!, lastAtRef.current)
      ingest(fresh)
    }, 6000)
    return () => clearInterval(poll)
  }, [user?.id, threadId, ingest])

  const submit = useCallback(async () => {
    const t = text.trim()
    if (!t || !user?.id || sending) return
    setSending(true)
    const m = await sendDM(threadId, user.id!, t)
    setSending(false)
    if (m) {
      setText("")
      setMessages(prev => [...prev, m])
      lastAtRef.current = m.created_at
      scrollToBottom()
    }
  }, [text, user?.id, threadId, sending])

  if (!user) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <button onClick={() => router.push("/register")} className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black">Sign In</button>
    </div>
  )

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        {other ? (
          <Link href={`/u/${other.other_id}`} className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[12px] font-bold overflow-hidden">
              {other.other_avatar ? <img src={other.other_avatar} alt="" className="h-full w-full object-cover" /> : (other.other_username || "U")[0]?.toUpperCase()}
            </div>
            <p className="text-sm font-black truncate flex items-center gap-1">
              {other.other_username}
              {other.other_account_type === "official" ? <BadgeCheck className="h-4 w-4 text-blue-400" />
                : other.other_account_type === "premium" ? <Crown className="h-4 w-4 text-amber-400" /> : null}
            </p>
          </Link>
        ) : <p className="text-sm font-black flex-1">Conversation</p>}
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
        ) : messages.length === 0 ? (
          <p className="text-center text-[12px] text-muted-foreground py-10">No messages yet — say hello 👋</p>
        ) : messages.map(m => {
          const mine = String(m.sender_id) === String(user.id)
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${mine ? "bg-amber-400 text-black rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"}`}>
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={`mt-0.5 text-[9px] ${mine ? "text-black/50" : "text-muted-foreground"}`}>
                  {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur px-3 py-2.5 pb-safe">
        <div className="flex items-center gap-2">
          <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Message…"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-[13px] outline-none focus:border-amber-400/50" />
          <button onClick={submit} disabled={sending || !text.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-black disabled:opacity-40">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
