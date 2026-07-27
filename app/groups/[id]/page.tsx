"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUserAuth } from "@/hooks/use-user-auth"
import {
  getGroupById, getMembership, joinGroup, leaveGroup,
  getGroupPosts, postToGroup, deleteGroupPost,
  getGroupMembers, moderateGroupMember,
  type DBGroup, type DBGroupPost, type DBGroupMember,
} from "@/lib/dabia/db"
import { PiBrowserGate } from "@/components/pi-browser-gate"
import {
  X, Users, Lock, Globe2, BadgeCheck, Loader2, Building, Send, Trash2,
  Shield, Crown, UserCheck, UserX, ArrowUp, ArrowDown, MessageSquare,
} from "lucide-react"

function timeAgo(iso?: string) {
  if (!iso) return ""
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "now"
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export default function GroupDetailPage() {
  useDabiaTranslation()
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const { user } = useUserAuth()

  const [group, setGroup] = useState<DBGroup | null>(null)
  const [membership, setMembership] = useState<{ status: string; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"feed" | "members">("feed")
  const [posts, setPosts] = useState<DBGroupPost[]>([])
  const [members, setMembers] = useState<DBGroupMember[]>([])
  const [text, setText] = useState("")
  const [posting, setPosting] = useState(false)
  const [busy, setBusy] = useState(false)

  const isActiveMember = membership?.status === "active"
  const isModerator = membership?.role === "owner" || membership?.role === "admin"
  const isOwner = membership?.role === "owner"

  const loadCore = useCallback(async () => {
    if (!id) return
    const [g, m] = await Promise.all([getGroupById(id), user?.id ? getMembership(id, user.id) : Promise.resolve(null)])
    setGroup(g); setMembership(m); setLoading(false)
  }, [id, user?.id])

  const loadFeed = useCallback(async () => { if (id) setPosts(await getGroupPosts(id)) }, [id])
  const loadMembers = useCallback(async () => { if (id) setMembers(await getGroupMembers(id)) }, [id])

  useEffect(() => { loadCore() }, [loadCore])
  useEffect(() => {
    // المحتوى يظهر للأعضاء النشطين، أو للجميع إن كانت المجموعة عامة
    if (group && (group.privacy === "public" || isActiveMember)) { loadFeed(); loadMembers() }
  }, [group, isActiveMember, loadFeed, loadMembers])

  const handleJoin = async () => {
    if (!user?.id) { router.push("/register"); return }
    setBusy(true)
    await joinGroup(id, user.id)
    await loadCore()
    setBusy(false)
  }
  const handleLeave = async () => {
    if (!user?.id || !confirm("Leave this community?")) return
    setBusy(true)
    await leaveGroup(id, user.id)
    await loadCore()
    setBusy(false)
  }

  const submitPost = async () => {
    if (!user?.id || !text.trim()) return
    setPosting(true)
    const p = await postToGroup({ group_id: id, user_id: user.id, username: user.username, avatar_url: user.avatar_url, text: text.trim() })
    setPosting(false)
    if (p) { setText(""); loadFeed() }
  }

  const removePost = async (postId: string) => {
    if (!user?.id || !confirm("Delete this post?")) return
    await deleteGroupPost(postId, user.id); loadFeed()
  }

  const moderate = async (targetId: string, action: "approve" | "remove" | "promote" | "demote") => {
    if (!user?.id) return
    await moderateGroupMember(id, user.id, targetId, action)
    loadMembers(); loadCore()
  }

  if (loading) return (
    <div className="flex min-h-dvh items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
  )
  if (!group) return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <p className="text-sm font-bold">Community not found</p>
      <button onClick={() => router.push("/groups")} className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-black">Browse communities</button>
    </div>
  )

  const canSeeContent = group.privacy === "public" || isActiveMember
  const pendingCount = members.filter(m => m.status === "pending").length

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PiBrowserGate />
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black flex-1 truncate">{group.name}</p>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* رأس المجموعة */}
        <div className={`border-b border-border p-4 space-y-3 ${group.is_official ? "bg-gradient-to-br from-blue-400/10 to-transparent" : ""}`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl overflow-hidden ${group.is_official ? "bg-blue-500/15" : "bg-secondary"}`}>
              {group.avatar_url ? <img src={group.avatar_url} alt="" className="h-full w-full object-cover" />
                : group.is_official ? <Building className="h-7 w-7 text-blue-400" /> : <Users className="h-7 w-7 text-muted-foreground" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="font-black text-base truncate">{group.name}</p>
                {group.is_official && <BadgeCheck className="h-4 w-4 text-blue-400 shrink-0" />}
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                {group.privacy === "private" ? <><Lock className="h-3 w-3" />Private</> : <><Globe2 className="h-3 w-3" />Public</>}
                {" · "}{group.member_count ?? 0} members{group.category ? ` · ${group.category}` : ""}
              </p>
            </div>
          </div>
          {group.description && <p className="text-[12px] leading-relaxed text-muted-foreground">{group.description}</p>}

          {/* زر العضوية */}
          {!membership ? (
            <button onClick={handleJoin} disabled={busy} className="w-full rounded-xl bg-amber-400 py-2.5 text-[13px] font-bold text-black disabled:opacity-50">
              {busy ? "…" : group.privacy === "private" ? "Request to Join" : "Join Community"}
            </button>
          ) : membership.status === "pending" ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 rounded-xl bg-amber-400/10 py-2.5 text-center text-[12px] font-bold text-amber-400">Join request pending</span>
              <button onClick={handleLeave} disabled={busy} className="rounded-xl border border-border px-4 py-2.5 text-[12px] font-bold text-muted-foreground">Cancel</button>
            </div>
          ) : !isOwner ? (
            <button onClick={handleLeave} disabled={busy} className="w-full rounded-xl border border-border py-2.5 text-[13px] font-bold text-muted-foreground disabled:opacity-50">
              Leave Community
            </button>
          ) : (
            <span className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400/10 py-2.5 text-[12px] font-bold text-amber-400"><Crown className="h-3.5 w-3.5" />You own this community</span>
          )}
        </div>

        {!canSeeContent ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center px-6">
            <Lock className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-bold">This is a private community</p>
            <p className="text-[12px] text-muted-foreground">Join to see posts and members.</p>
          </div>
        ) : (
          <>
            <div className="flex border-b border-border">
              <button onClick={() => setTab("feed")}
                className={`flex-1 py-3 text-xs font-bold transition-colors ${tab === "feed" ? "text-amber-400 border-b-2 border-amber-400" : "text-muted-foreground"}`}>
                Feed ({posts.length})
              </button>
              <button onClick={() => setTab("members")}
                className={`flex-1 py-3 text-xs font-bold transition-colors ${tab === "members" ? "text-amber-400 border-b-2 border-amber-400" : "text-muted-foreground"}`}>
                Members ({group.member_count ?? 0}){isModerator && pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
              </button>
            </div>

            {tab === "feed" ? (
              <div className="p-4 space-y-3">
                {posts.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
                    <MessageSquare className="h-9 w-9 opacity-40" />
                    <p className="text-[12px]">No posts yet{isActiveMember ? " — start the conversation" : ""}</p>
                  </div>
                ) : posts.map(p => {
                  const canDelete = !!user?.id && (String(p.user_id) === String(user.id) || isModerator)
                  return (
                    <div key={p.id} className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold overflow-hidden">
                          {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : p.username[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-bold truncate">{p.username}</p>
                          <p className="text-[10px] text-muted-foreground">{timeAgo(p.created_at)}</p>
                        </div>
                        {canDelete && <button onClick={() => removePost(p.id!)} className="text-muted-foreground"><Trash2 className="h-3.5 w-3.5" /></button>}
                      </div>
                      {p.text && <p className="text-[13px] whitespace-pre-wrap leading-relaxed">{p.text}</p>}
                      {p.product_snapshot && (
                        <div className="rounded-xl border border-border bg-secondary/40 p-2.5 flex items-center gap-2.5">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-background text-xl">{p.product_snapshot.image || "📦"}</div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-bold truncate">{p.product_snapshot.name}</p>
                            <p className="text-amber-400 font-black text-[12px]">{p.product_snapshot.price}π</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {isModerator && members.some(m => m.status === "pending") && (
                  <p className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5" />Pending requests</p>
                )}
                {members.map(m => (
                  <div key={m.user_id} className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[12px] font-bold overflow-hidden">
                      {m.avatar_url ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" /> : (m.username || "U")[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold truncate">{m.username || `User ${m.user_id}`}</p>
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground capitalize">
                        {m.role === "owner" && <Crown className="h-2.5 w-2.5 text-amber-400" />}
                        {m.role === "admin" && <Shield className="h-2.5 w-2.5 text-blue-400" />}
                        {m.status === "pending" ? "Requested to join" : m.role}
                      </p>
                    </div>
                    {isModerator && m.role !== "owner" && String(m.user_id) !== String(user?.id) && (
                      <div className="flex items-center gap-1 shrink-0">
                        {m.status === "pending" ? (
                          <>
                            <button onClick={() => moderate(m.user_id, "approve")} className="rounded-lg bg-emerald-400/10 p-1.5 text-emerald-400" title="Approve"><UserCheck className="h-3.5 w-3.5" /></button>
                            <button onClick={() => moderate(m.user_id, "remove")} className="rounded-lg bg-red-400/10 p-1.5 text-red-400" title="Reject"><UserX className="h-3.5 w-3.5" /></button>
                          </>
                        ) : (
                          <>
                            {isOwner && (m.role === "member"
                              ? <button onClick={() => moderate(m.user_id, "promote")} className="rounded-lg bg-blue-400/10 p-1.5 text-blue-400" title="Make admin"><ArrowUp className="h-3.5 w-3.5" /></button>
                              : <button onClick={() => moderate(m.user_id, "demote")} className="rounded-lg bg-secondary p-1.5 text-muted-foreground" title="Remove admin"><ArrowDown className="h-3.5 w-3.5" /></button>
                            )}
                            <button onClick={() => moderate(m.user_id, "remove")} className="rounded-lg bg-red-400/10 p-1.5 text-red-400" title="Remove"><UserX className="h-3.5 w-3.5" /></button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* شريط النشر — للأعضاء النشطين فقط في تبويب الفيد */}
      {canSeeContent && isActiveMember && tab === "feed" && (
        <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur px-3 py-2.5 pb-safe">
          <div className="flex items-center gap-2">
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && submitPost()}
              placeholder="Share something with the community…"
              className="flex-1 rounded-xl input-field px-3 py-2.5 text-[13px]" />
            <button onClick={submitPost} disabled={posting || !text.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-black disabled:opacity-40">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
