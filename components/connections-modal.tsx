"use client"
// قائمة المتابِعين والمتابَعين مع إدارة كاملة: متابعة/إلغاء/رد المتابعة + جرس
// تفعيل إشعارات كل حساب متابَع — كالتطبيقات العالمية.
import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import {
  getFollowers, getFollowing, followUser, unfollowUser, setFollowNotify,
  type FollowPerson,
} from "@/lib/dabia/db"
import { X, Loader2, BadgeCheck, Crown, Bell, BellOff } from "lucide-react"

export function ConnectionsModal({ userId, viewerId, initialTab = "followers", onClose }: {
  userId: string; viewerId?: string; initialTab?: "followers" | "following"; onClose: () => void
}) {
  const [tab, setTab] = useState<"followers" | "following">(initialTab)
  const [people, setPeople] = useState<FollowPerson[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const load = useCallback(() => {
    setLoading(true)
    const fn = tab === "followers" ? getFollowers : getFollowing
    fn(userId, viewerId).then(setPeople).finally(() => setLoading(false))
  }, [tab, userId, viewerId])
  useEffect(() => { load() }, [load])

  const isOwnList = String(viewerId) === String(userId)

  const toggleFollow = async (p: FollowPerson) => {
    if (!viewerId) return
    const next = !p.viewer_follows
    setPeople(prev => prev.map(x => x.user_id === p.user_id ? { ...x, viewer_follows: next } : x))
    if (next) await followUser(viewerId, p.user_id); else await unfollowUser(viewerId, p.user_id)
  }
  const toggleNotify = async (p: FollowPerson) => {
    if (!viewerId) return
    const next = !p.notify
    setPeople(prev => prev.map(x => x.user_id === p.user_id ? { ...x, notify: next } : x))
    await setFollowNotify(viewerId, p.user_id, next)
  }

  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3 pt-safe">
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black">Connections</p>
      </header>
      <div className="flex border-b border-border">
        {(["followers", "following"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-[13px] font-bold capitalize transition-colors ${tab === t ? "text-amber-400 border-b-2 border-amber-400" : "text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
        ) : people.length === 0 ? (
          <p className="text-center text-[12px] text-muted-foreground py-16">{tab === "followers" ? "No followers yet" : "Not following anyone yet"}</p>
        ) : people.map(p => {
          const isSelf = String(p.user_id) === String(viewerId)
          return (
            <div key={p.user_id} className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Link href={`/u/${p.user_id}`} onClick={onClose} className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-[13px] font-bold overflow-hidden">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : (p.username || "U")[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold truncate flex items-center gap-1">
                    {p.store_name || p.username}
                    {p.account_type === "official" ? <BadgeCheck className="h-3.5 w-3.5 text-blue-400" /> : p.account_type === "premium" ? <Crown className="h-3.5 w-3.5 text-amber-400" /> : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">@{p.username}</p>
                </div>
              </Link>
              {!isSelf && viewerId && (
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* جرس إشعارات الحساب — يظهر عند متابعته */}
                  {p.viewer_follows && (isOwnList && tab === "following") && (
                    <button onClick={() => toggleNotify(p)} title="Post notifications"
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border ${p.notify ? "border-amber-400/40 bg-amber-400/10 text-amber-400" : "border-border text-muted-foreground"}`}>
                      {p.notify ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  <button onClick={() => toggleFollow(p)}
                    className={`rounded-xl px-3 py-1.5 text-[11px] font-bold ${p.viewer_follows ? "border border-border text-muted-foreground" : "bg-amber-400 text-black"}`}>
                    {p.viewer_follows ? "Following" : (tab === "followers" ? "Follow back" : "Follow")}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>,
    document.body
  )
}
