"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  getSocialFeed, getFollowing, followUser, unfollowUser,
  toggleLike, isLikedByUser, getLikeCount,
  getComments, addComment,
  toggleSavePost, isPostSaved,
  votePoll,
  createTextPost, createPoll,
  getLiveStreams,
  type DBPost, type DBComment, type DBLiveStream,
} from "@/lib/dabia/db"
import { useUserAuth } from "@/hooks/use-user-auth"
import { LiveStreamRoom } from "@/components/live-stream"
import {
  Home, Compass, Users2, Layers, User,
  Heart, MessageCircle, Bookmark, Share2, Plus,
  UserPlus, Check, Loader2, Radio, X, Send,
  ChevronDown, Megaphone, ShoppingBag, BarChart3
} from "lucide-react"

// ─── helpers ──────────────────────────────────────────────────────────────────
function timeAgo(ts?: string) {
  if (!ts) return ""
  const s = (Date.now() - new Date(ts).getTime()) / 1000
  if (s < 60) return `${Math.floor(s)}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

// ─── Post slide (one full-screen card) ────────────────────────────────────────
function PostSlide({
  post, user, isFollowed, onToggleFollow,
}: {
  post: DBPost
  user: any
  isFollowed: boolean
  onToggleFollow: (id: string) => void
}) {
  const postId = String(post.id)
  const authorId = String(post.user_id)
  const isMe = String(user?.id) === authorId

  // interactions state
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<DBComment[]>([])
  const [commentText, setCommentText] = useState("")
  const [shareMsg, setShareMsg] = useState("")

  // poll vote
  const [voted, setVoted] = useState<number | null>(null)
  const [localPoll, setLocalPoll] = useState(post.poll ?? null)

  useEffect(() => {
    getLikeCount(postId).then(setLikeCount)
    if (user?.id) {
      isLikedByUser(user.id, postId).then(setLiked)
      isPostSaved(user.id, postId).then(setSaved)
    }
  }, [postId, user?.id])

  const handleLike = async () => {
    if (!user?.id) return
    setLiked(v => !v)
    setLikeCount(c => c + (liked ? -1 : 1))
    await toggleLike(user.id, postId)
  }

  const handleSave = async () => {
    if (!user?.id) return
    setSaved(v => !v)
    await toggleSavePost(user.id, postId)
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/?p=${postId}`
    try {
      if (navigator.share) await navigator.share({ title: post.username, url })
      else {
        await navigator.clipboard?.writeText(url)
        setShareMsg("✓ Copied")
        setTimeout(() => setShareMsg(""), 1500)
      }
    } catch {}
  }

  const openComments = async () => {
    setShowComments(v => !v)
    if (!showComments) {
      const list = await getComments(postId)
      setComments(list)
    }
  }

  const submitComment = async () => {
    if (!user || !commentText.trim()) return
    const { comment } = await addComment({
      product_id: postId, user_id: user.id!,
      username: user.username, avatar_url: user.avatar_url,
      text: commentText.trim(),
    })
    if (comment) { setComments(c => [comment, ...c]); setCommentText("") }
  }

  const handleVote = async (optIdx: number) => {
    if (!user?.id || voted !== null || !localPoll) return
    setVoted(optIdx)
    await votePoll(postId, optIdx)
    // optimistic local update: increment vote count for selected option
    setLocalPoll(prev => {
      if (!prev) return prev
      return {
        ...prev,
        options: prev.options.map((o, i) =>
          i === optIdx ? { ...o, votes: o.votes + 1 } : o
        ),
      }
    })
  }

  // ── background style per post type ──
  const bgStyle = (): string => {
    if (post.type === "product_share" && post.product_snapshot?.image?.startsWith("http"))
      return "" // uses img tag
    const hues = ["220,70%", "260,65%", "180,55%", "330,60%", "30,70%"]
    const h = hues[Math.abs((post.user_id?.charCodeAt(0) ?? 0) + (post.id?.charCodeAt(0) ?? 0)) % hues.length]
    return `hsl(${h},20%)`
  }

  const hasProductImage = post.type === "product_share" && post.product_snapshot?.image?.startsWith("http")

  return (
    <div className="relative h-full w-full flex-shrink-0 snap-start overflow-hidden bg-black">

      {/* Background */}
      {hasProductImage ? (
        <img
          src={post.product_snapshot!.image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: bgStyle() }} />
      )}

      {/* gradient overlays for readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/50" />

      {/* ── Right action bar (TikTok style) ── */}
      <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-5">
        {/* avatar + follow */}
        <div className="relative flex flex-col items-center gap-1">
          <div className="h-11 w-11 rounded-full border-2 border-white overflow-hidden bg-white/10 flex items-center justify-center text-sm font-black text-white">
            {post.avatar_url
              ? <img src={post.avatar_url} alt="" className="h-full w-full object-cover" />
              : (post.username?.[0] ?? "?").toUpperCase()}
          </div>
          {!isMe && (
            <button
              onClick={() => onToggleFollow(authorId)}
              className={`absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black transition-colors
                ${isFollowed ? "bg-white/20 text-white" : "bg-amber-400 text-black"}`}
            >
              {isFollowed ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
            </button>
          )}
        </div>

        {/* Like */}
        <button onClick={handleLike} className="flex flex-col items-center gap-1 text-white">
          <span className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${liked ? "text-red-500" : "text-white"}`}>
            <Heart className="h-6 w-6" fill={liked ? "currentColor" : "none"} strokeWidth={liked ? 0 : 1.8} />
          </span>
          <span className="text-[11px] font-bold tabular-nums">{likeCount || ""}</span>
        </button>

        {/* Comment */}
        <button onClick={openComments} className="flex flex-col items-center gap-1 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-full">
            <MessageCircle className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <span className="text-[11px] font-bold">{comments.length || ""}</span>
        </button>

        {/* Save */}
        <button onClick={handleSave} className="flex flex-col items-center gap-1 text-white">
          <span className={`flex h-11 w-11 items-center justify-center rounded-full ${saved ? "text-amber-400" : "text-white"}`}>
            <Bookmark className="h-6 w-6" fill={saved ? "currentColor" : "none"} strokeWidth={saved ? 0 : 1.8} />
          </span>
          <span className="text-[11px] font-bold">{saved ? "Saved" : "Save"}</span>
        </button>

        {/* Share */}
        <button onClick={handleShare} className="flex flex-col items-center gap-1 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-full">
            <Share2 className="h-5.5 w-5.5" strokeWidth={1.8} />
          </span>
          <span className="text-[11px] font-bold">{shareMsg || "Share"}</span>
        </button>
      </div>

      {/* ── Bottom-left info area (TikTok style) ── */}
      <div className="absolute inset-x-0 bottom-0 z-20 pr-16 p-4 pb-6 space-y-2">
        {/* author */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-white">@{post.username}</span>
          {post.account_type === "official" && (
            <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black text-black">OFFICIAL</span>
          )}
          {post.account_type === "premium" && (
            <span className="rounded-full bg-violet-500 px-1.5 py-0.5 text-[9px] font-black text-white">PRO</span>
          )}
          <span className="text-[11px] text-white/50 ml-auto">{timeAgo(post.created_at)}</span>
        </div>

        {/* post type badge */}
        {post.type === "announcement" && (
          <div className="flex items-center gap-1.5">
            <Megaphone className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[11px] font-bold text-amber-400">Announcement</span>
          </div>
        )}
        {post.type === "product_share" && post.product_snapshot && (
          <div className="flex items-center gap-2 rounded-xl bg-black/40 backdrop-blur px-3 py-1.5 w-fit">
            <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[12px] font-bold text-white">{post.product_snapshot.name}</span>
            <span className="text-[12px] font-black text-amber-400">{post.product_snapshot.price}π</span>
          </div>
        )}

        {/* text content */}
        {post.text && (
          <p className="text-[14px] font-medium text-white leading-snug line-clamp-4 drop-shadow-sm">
            {post.text}
          </p>
        )}

        {/* Poll voting */}
        {post.type === "poll" && localPoll && (
          <div className="space-y-2 mt-1">
            <p className="text-[13px] font-black text-white">{localPoll.question}</p>
            <div className="space-y-1.5">
              {localPoll.options.map((opt, i) => {
                const total = localPoll.options.reduce((a, o) => a + o.votes, 0)
                const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0
                const maxVotes = Math.max(...localPoll.options.map(o => o.votes))
                const isWinner = voted !== null && opt.votes === maxVotes && maxVotes > 0
                return (
                  <button
                    key={i}
                    onClick={() => handleVote(i)}
                    disabled={voted !== null}
                    className="relative w-full overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur px-3 py-2 text-left transition-all active:scale-[0.98]"
                  >
                    {voted !== null && (
                      <div
                        className={`absolute inset-y-0 left-0 transition-all ${isWinner ? "bg-amber-400/30" : "bg-white/10"}`}
                        style={{ width: `${pct}%` }}
                      />
                    )}
                    <div className="relative flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-white">{opt.text}</span>
                      {voted !== null && (
                        <span className="text-[11px] font-black text-white/70">{pct}%</span>
                      )}
                    </div>
                  </button>
                )
              })}
              {voted !== null && (
                <p className="text-[11px] text-white/50">
                  {localPoll.options.reduce((a, o) => a + o.votes, 0)} votes
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Comments drawer ── */}
      {showComments && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col rounded-t-3xl bg-black/95 backdrop-blur max-h-[70%]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <p className="text-sm font-black text-white">Comments</p>
            <button onClick={() => setShowComments(false)} className="text-white/50">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
            {comments.length === 0 && (
              <p className="text-center text-[12px] text-white/40 py-8">No comments yet — be first</p>
            )}
            {comments.map((c, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="h-8 w-8 shrink-0 rounded-full bg-white/10 flex items-center justify-center text-[11px] font-black text-white overflow-hidden">
                  {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover" /> : (c.username?.[0] ?? "?").toUpperCase()}
                </div>
                <div>
                  <p className="text-[12px] font-bold text-white/80">{c.username}</p>
                  <p className="text-[13px] text-white leading-snug">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
          {user && (
            <div className="flex gap-2 border-t border-white/10 px-3 py-2.5">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitComment()}
                placeholder="Add a comment…"
                className="flex-1 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white placeholder:text-white/40 outline-none"
              />
              <button
                onClick={submitComment}
                disabled={!commentText.trim()}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400 text-black disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function SocialPage() {
  const router = useRouter()
  const { user } = useUserAuth()
  const [scope, setScope] = useState<"foryou" | "following">("foryou")
  const [posts, setPosts] = useState<DBPost[]>([])
  const [loading, setLoading] = useState(true)
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set())
  const [liveStreams, setLiveStreams] = useState<DBLiveStream[]>([])
  const [activeStream, setActiveStream] = useState<DBLiveStream | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [feed, live] = await Promise.all([
      getSocialFeed(scope, user?.id),
      getLiveStreams(),
    ])
    setPosts(feed)
    setLiveStreams(live)
    if (user?.id) {
      const following = await getFollowing(user.id, user.id)
      setFollowingSet(new Set(following.map((f: any) => f.user_id)))
    }
    setLoading(false)
  }, [scope, user?.id])

  useEffect(() => { load() }, [load])

  const toggleFollow = useCallback(async (authorId: string) => {
    if (!user?.id) return
    const isFollowed = followingSet.has(authorId)
    setFollowingSet(prev => {
      const n = new Set(prev)
      isFollowed ? n.delete(authorId) : n.add(authorId)
      return n
    })
    if (isFollowed) await unfollowUser(user.id, authorId)
    else await followUser(user.id, authorId)
  }, [user?.id, followingSet])

  if (activeStream) {
    return <LiveStreamRoom stream={activeStream} user={user} onClose={() => setActiveStream(null)} />
  }

  return (
    <div className="flex h-dvh w-full flex-col bg-black overflow-hidden">

      {/* ── Top bar ── */}
      <div className="relative z-30 flex items-center justify-center gap-8 px-4 py-3 pt-safe">
        {/* Live streams pill */}
        {liveStreams.length > 0 && (
          <div className="absolute left-3 flex items-center gap-1">
            {liveStreams.slice(0, 2).map(ls => (
              <button key={ls.id} onClick={() => setActiveStream(ls)}
                className="flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-500/10 px-2.5 py-1 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[11px] font-black text-red-400">LIVE</span>
              </button>
            ))}
          </div>
        )}

        {/* For You / Following */}
        {(["foryou", "following"] as const).map(s => (
          <button key={s} onClick={() => setScope(s)}
            className={`relative pb-1.5 text-[15px] font-black transition-all ${scope === s ? "text-white" : "text-white/40"}`}>
            {s === "foryou" ? "For You" : "Following"}
            {scope === s && (
              <span className="absolute -bottom-px left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-white" />
            )}
          </button>
        ))}

        {/* Create + */}
        {user && (
          <button onClick={() => setShowCreate(true)}
            className="absolute right-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur text-white">
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-white/40" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center px-8">
          <Users2 className="h-12 w-12 text-white/20" />
          <p className="text-sm font-bold text-white/60">
            {scope === "following" ? "Follow people to see their posts here" : "No posts yet — be the first"}
          </p>
          {user && (
            <button onClick={() => setShowCreate(true)}
              className="mt-2 rounded-2xl bg-amber-400 px-6 py-2.5 text-sm font-black text-black">
              Create Post
            </button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar" style={{ scrollSnapType: "y mandatory" }}>
          {posts.map(post => (
            <div key={post.id} className="h-full" style={{ height: "calc(100dvh - 120px)" }}>
              <PostSlide
                post={post}
                user={user}
                isFollowed={followingSet.has(String(post.user_id))}
                onToggleFollow={toggleFollow}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Bottom nav ── */}
      <nav className="z-30 border-t border-white/10 bg-black/80 backdrop-blur pb-safe">
        <div className="flex items-stretch">
          {[
            { href: "/", icon: <Home className="h-5 w-5" />, label: "Home" },
            { href: "/?tab=discover", icon: <Compass className="h-5 w-5" />, label: "Discover" },
            { href: "/social", icon: <Users2 className="h-5 w-5" />, label: "Social", active: true },
            { href: "/?tab=space", icon: <Layers className="h-5 w-5" />, label: "Space" },
            { href: "/?tab=profile", icon: <User className="h-5 w-5" />, label: "Profile" },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[52px] py-2.5 transition-colors relative
                ${item.active ? "text-white" : "text-white/40"}`}>
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-white" />
              )}
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Quick create sheet ── */}
      {showCreate && user && (
        <QuickCreate user={user} onClose={() => { setShowCreate(false); load() }} />
      )}
    </div>
  )
}

// ─── Quick Create Sheet ────────────────────────────────────────────────────────
function QuickCreate({ user, onClose }: { user: any; onClose: () => void }) {
  const [mode, setMode] = useState<"text" | "poll">("text")
  const [text, setText] = useState("")
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (busy) return
    setBusy(true)
    if (mode === "text") {
      if (!text.trim()) { setBusy(false); return }
      await createTextPost(user.id, user.username, text.trim())
    } else {
      if (!question.trim() || options.filter(o => o.trim()).length < 2) { setBusy(false); return }
      await createPoll(user.id, user.username, question.trim(), options.filter(o => o.trim()))
    }
    setBusy(false)
    onClose()
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black/80 backdrop-blur">
      <div className="mt-auto rounded-t-3xl bg-[#111] p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            {(["text", "poll"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors
                  ${mode === m ? "bg-white text-black" : "bg-white/10 text-white/60"}`}>
                {m === "text" ? "Post" : "Poll"}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-white/50"><X className="h-5 w-5" /></button>
        </div>

        {mode === "text" ? (
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            autoFocus
            placeholder="Share something with your followers…"
            className="w-full resize-none rounded-2xl bg-white/8 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:bg-white/12"
          />
        ) : (
          <div className="space-y-2">
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Your question…"
              className="w-full rounded-2xl bg-white/8 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:bg-white/12"
            />
            {options.map((o, i) => (
              <input key={i} value={o}
                onChange={e => setOptions(opts => opts.map((x, j) => j === i ? e.target.value : x))}
                placeholder={`Option ${i + 1}`}
                className="w-full rounded-2xl bg-white/8 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:bg-white/12"
              />
            ))}
            {options.length < 4 && (
              <button onClick={() => setOptions(o => [...o, ""])}
                className="text-[12px] font-bold text-amber-400">
                + Add option
              </button>
            )}
          </div>
        )}

        <button onClick={submit} disabled={busy}
          className="w-full rounded-2xl bg-amber-400 py-3.5 text-sm font-black text-black disabled:opacity-40 flex items-center justify-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
        </button>
      </div>
    </div>
  )
}
