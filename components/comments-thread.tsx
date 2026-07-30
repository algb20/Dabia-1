"use client"
// ═══════════════════════════════════════════════════════════════════════════
// نظام تعليقات كامل (كالتطبيقات العالمية): ردود متداخلة، تفاعل (إعجاب)، ذكر
// الأشخاص @username مع إشعار، تعديل/حذف تعليقك، وإشراف صاحب المنشور (حذف أي
// تعليق مسيء). تصميم تقني نظيف بلا تشويش بصري.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState, useCallback, useRef } from "react"
import {
  addComment, getComments, updateComment, deleteComment,
  toggleCommentLike, getCommentLikes, processMentions, searchAccounts,
  type DBComment, type DBUser,
} from "@/lib/dabia/db"
import { Heart, MessageSquare, Edit3, Trash2, Send, Loader2, Shield } from "lucide-react"

// يبرز الإشارات @username داخل النص
function renderText(text: string) {
  return text.split(/(@[a-zA-Z0-9_]+)/g).map((part, i) =>
    part.startsWith("@")
      ? <span key={i} className="font-semibold text-amber-400">{part}</span>
      : <span key={i}>{part}</span>
  )
}

function timeAgo(iso?: string): string {
  if (!iso) return ""
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "now"
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export function CommentsThread({ threadId, currentUser, ownerId, threadType = "product" }: {
  threadId: string; currentUser: DBUser | null; ownerId?: string
  // نوع الخيط: منتج أو منشور. جدول التعليقات مشترك ومفتاحه نصّي، لذا نُميّز
  // منشورات عن منتجات بمساحة أسماء (post:<id>) لمنع تصادم معرّفات المنتجات
  // والمنشورات (تسلسلان منفصلان). المنتجات تبقى بمعرّفها الرقمي كما كان.
  threadType?: "product" | "post"
}) {
  const storageKey = threadType === "post" ? `post:${threadId}` : threadId
  const [comments, setComments] = useState<DBComment[]>([])
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [replyTo, setReplyTo] = useState<DBComment | null>(null)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState("")
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionResults, setMentionResults] = useState<{ username: string }[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const list = await getComments(storageKey)
    setComments(list)
    if (currentUser?.id) {
      const ids = list.map(c => String(c.id))
      setLiked(await getCommentLikes(currentUser.id, ids))
    }
    setLoading(false)
  }, [storageKey, currentUser?.id])
  useEffect(() => { load() }, [load])

  // بناء الشجرة: أعلى مستوى + ردود
  const roots = comments.filter(c => !c.parent_id)
  const repliesOf = (id?: string) => comments.filter(c => String(c.parent_id) === String(id))

  // اقتراح أسماء عند كتابة @
  useEffect(() => {
    if (mentionQuery === null || mentionQuery.length < 1) { setMentionResults([]); return }
    let active = true
    searchAccounts(mentionQuery).then(r => { if (active) setMentionResults(r.slice(0, 5).map(x => ({ username: x.username }))) })
    return () => { active = false }
  }, [mentionQuery])

  const onChange = (v: string) => {
    setText(v)
    const m = v.match(/@([a-zA-Z0-9_]*)$/)
    setMentionQuery(m ? m[1] : null)
  }
  const pickMention = (username: string) => {
    setText(t => t.replace(/@([a-zA-Z0-9_]*)$/, `@${username} `))
    setMentionQuery(null)
    inputRef.current?.focus()
  }

  const submit = async () => {
    const t = text.trim()
    if (!t || !currentUser) return
    setPosting(true); setError("")
    const { comment, error: e } = await addComment({
      product_id: storageKey, user_id: currentUser.id!, username: currentUser.username,
      avatar_url: currentUser.avatar_url, text: t, parent_id: replyTo?.id ?? null,
    })
    setPosting(false)
    if (comment) {
      setText(""); setReplyTo(null)
      processMentions(t, currentUser.id!, currentUser.username, threadId)
      load()
    } else setError(e || "Failed to comment")
  }

  const isOwnerOfThread = !!currentUser?.id && String(currentUser.id) === String(ownerId)

  return (
    <div className="space-y-3">
      {error && <p className="text-[11px] text-red-400">{error}</p>}

      <div className="space-y-3 max-h-72 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-amber-400" /></div>
        ) : roots.length === 0 ? (
          <p className="text-[11px] text-muted-foreground text-center py-3">No comments yet — start the conversation</p>
        ) : roots.map(c => (
          <CommentItem key={c.id} comment={c} replies={repliesOf(c.id)}
            currentUser={currentUser} liked={liked} isThreadOwner={isOwnerOfThread}
            onReply={(cm) => { setReplyTo(cm); inputRef.current?.focus() }}
            onChanged={load} onToggleLike={async (id) => {
              if (!currentUser?.id) return
              setLiked(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
              await toggleCommentLike(id, currentUser.id); load()
            }} />
        ))}
      </div>

      {currentUser ? (
        <div className="relative">
          {replyTo && (
            <div className="mb-1 flex items-center justify-between rounded-lg bg-secondary/50 px-2.5 py-1">
              <span className="text-[10px] text-muted-foreground">Replying to <span className="font-semibold text-amber-400">@{replyTo.username}</span></span>
              <button onClick={() => setReplyTo(null)} className="text-[10px] text-muted-foreground">Cancel</button>
            </div>
          )}
          {mentionQuery !== null && mentionResults.length > 0 && (
            <div className="absolute bottom-full mb-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden z-10">
              {mentionResults.map(r => (
                <button key={r.username} onClick={() => pickMention(r.username)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] hover:bg-secondary">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-[10px] font-bold">{r.username[0]?.toUpperCase()}</span>
                  @{r.username}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input ref={inputRef} value={text} onChange={e => onChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder={replyTo ? "Write a reply… use @ to mention" : "Add a comment… use @ to mention"}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-amber-400/50" />
            <button onClick={submit} disabled={posting || !text.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-black disabled:opacity-40">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground text-center">Sign in to comment</p>
      )}
    </div>
  )
}

function CommentItem({ comment, replies, currentUser, liked, isThreadOwner, onReply, onChanged, onToggleLike }: {
  comment: DBComment; replies: DBComment[]; currentUser: DBUser | null; liked: Set<string>
  isThreadOwner: boolean; onReply: (c: DBComment) => void; onChanged: () => void; onToggleLike: (id: string) => void
}) {
  const isMine = !!currentUser?.id && String(comment.user_id) === String(currentUser.id)
  const canDelete = isMine || isThreadOwner // صاحب التعليق أو صاحب المنشور (إشراف)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.text)
  const isLiked = liked.has(String(comment.id))

  const saveEdit = async () => {
    const t = editText.trim()
    if (!t || t === comment.text) { setEditing(false); return }
    await updateComment(comment.id!, t); setEditing(false); onChanged()
  }
  const remove = async () => {
    if (!confirm(isThreadOwner && !isMine ? "Remove this comment as the post owner?" : "Delete this comment?")) return
    await deleteComment(comment.id!); onChanged()
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold overflow-hidden">
        {comment.avatar_url ? <img src={comment.avatar_url} alt="" className="h-full w-full object-cover" /> : comment.username[0]?.toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input value={editText} onChange={e => setEditText(e.target.value)} onKeyDown={e => e.key === "Enter" && saveEdit()} autoFocus
              className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-[12px] outline-none focus:border-amber-400/50" />
            <button onClick={saveEdit} className="text-[11px] font-bold text-amber-400">Save</button>
            <button onClick={() => { setEditing(false); setEditText(comment.text) }} className="text-[11px] text-muted-foreground">Cancel</button>
          </div>
        ) : (
          <>
            <p className="text-[12px] leading-snug">
              <span className="font-bold">{comment.username}</span>{" "}
              <span className="text-muted-foreground">{renderText(comment.text)}</span>
            </p>
            <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>{timeAgo(comment.created_at)}</span>
              <button onClick={() => onToggleLike(String(comment.id))} className={`flex items-center gap-0.5 ${isLiked ? "text-red-400" : ""}`}>
                <Heart className="h-3 w-3" fill={isLiked ? "currentColor" : "none"} />{comment.like_count ? comment.like_count : ""}
              </button>
              {currentUser && <button onClick={() => onReply(comment)} className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />Reply</button>}
              {isMine && <button onClick={() => setEditing(true)}><Edit3 className="h-3 w-3" /></button>}
              {canDelete && <button onClick={remove} className="flex items-center gap-0.5">{isThreadOwner && !isMine ? <Shield className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}</button>}
            </div>
          </>
        )}

        {/* الردود */}
        {replies.length > 0 && (
          <div className="mt-2 space-y-2 border-l border-border pl-2.5">
            {replies.map(r => {
              const rMine = !!currentUser?.id && String(r.user_id) === String(currentUser.id)
              const rLiked = liked.has(String(r.id))
              return (
                <div key={r.id} className="flex items-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold overflow-hidden">
                    {r.avatar_url ? <img src={r.avatar_url} alt="" className="h-full w-full object-cover" /> : r.username[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] leading-snug"><span className="font-bold">{r.username}</span> <span className="text-muted-foreground">{renderText(r.text)}</span></p>
                    <div className="mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span>{timeAgo(r.created_at)}</span>
                      <button onClick={() => onToggleLike(String(r.id))} className={`flex items-center gap-0.5 ${rLiked ? "text-red-400" : ""}`}>
                        <Heart className="h-3 w-3" fill={rLiked ? "currentColor" : "none"} />{r.like_count ? r.like_count : ""}
                      </button>
                      {(rMine || isThreadOwner) && <button onClick={async () => { if (confirm("Delete this reply?")) { await deleteComment(r.id!); onChanged() } }}>{isThreadOwner && !rMine ? <Shield className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}</button>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
