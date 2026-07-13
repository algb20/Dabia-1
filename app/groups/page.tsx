"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useUserAuth } from "@/hooks/use-user-auth"
import {
  getGroups, getMyGroups, createGroup, joinGroup,
  type DBGroup,
} from "@/lib/dabia/db"
import {
  X, Users, Search, Plus, Lock, Globe2, BadgeCheck, Loader2, Building, ChevronRight, Crown,
} from "lucide-react"

const CATEGORIES = ["All", "Companies", "Electronics", "Fashion", "Home", "Health", "Art", "Services", "General"]

export default function GroupsPage() {
  useDabiaTranslation()
  const router = useRouter()
  const { user } = useUserAuth()
  const [tab, setTab] = useState<"discover" | "mine">("discover")
  const [groups, setGroups] = useState<DBGroup[]>([])
  const [mine, setMine] = useState<Array<DBGroup & { my_status: string; my_role: string }>>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [showCreate, setShowCreate] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)

  // إنشاء المجموعات للحسابات التجارية/المهمة فقط (شركات، مصانع، تجّار، مزوّدو خدمة…)
  const canCreate = !!user && user.role !== "buyer"

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      getGroups({ search: search.trim() || undefined, category }),
      user?.id ? getMyGroups(user.id) : Promise.resolve([]),
    ]).then(([g, m]) => { setGroups(g); setMine(m) }).finally(() => setLoading(false))
  }, [search, category, user?.id])
  useEffect(() => { load() }, [load])

  const myIds = new Set(mine.map(g => String(g.id)))

  const handleJoin = async (g: DBGroup) => {
    if (!user?.id) { router.push("/register"); return }
    setJoining(String(g.id))
    const res = await joinGroup(g.id!, user.id)
    setJoining(null)
    if (res) load()
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black flex-1">Communities</p>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 rounded-xl bg-amber-400 px-3 py-1.5 text-[12px] font-bold text-black active:scale-95">
            <Plus className="h-3.5 w-3.5" />Create
          </button>
        )}
      </header>

      <div className="flex gap-1.5 px-4 pt-3">
        {(["discover", "mine"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-xl py-2 text-[12px] font-bold capitalize transition-all ${tab === t ? "bg-amber-400 text-black" : "border border-border bg-secondary/40 text-muted-foreground"}`}>
            {t === "mine" ? "My Groups" : "Discover"}
          </button>
        ))}
      </div>

      {tab === "discover" && (
        <>
          <div className="px-4 pt-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search communities"
                className="flex-1 bg-transparent text-[13px] outline-none" />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 py-2.5 no-scrollbar">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${category === c ? "bg-amber-400 text-black" : "border border-border bg-secondary/40 text-muted-foreground"}`}>
                {c}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex-1 overflow-y-auto px-4 pb-20 pt-1 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
        ) : tab === "discover" ? (
          groups.length === 0 ? (
            <EmptyState label="No communities yet" hint={canCreate ? "Be the first — create one" : "Check back soon"} />
          ) : groups.map(g => (
            <GroupRow key={g.id} g={g} joined={myIds.has(String(g.id))} joining={joining === String(g.id)}
              onOpen={() => router.push(`/groups/${g.id}`)} onJoin={() => handleJoin(g)} />
          ))
        ) : (
          mine.length === 0 ? (
            <EmptyState label="You haven't joined any group" hint="Discover communities to join" />
          ) : mine.map(g => (
            <button key={g.id} onClick={() => router.push(`/groups/${g.id}`)}
              className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left active:scale-[0.99] transition-transform">
              <GroupAvatar g={g} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-bold truncate">{g.name}</p>
                  {g.is_official && <BadgeCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {g.my_role === "owner" ? "Owner" : g.my_role === "admin" ? "Admin" : "Member"}
                  {g.my_status === "pending" && " · request pending"}
                  {" · "}{g.member_count ?? 0} members
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))
        )}
      </div>

      {showCreate && user && (
        <CreateGroupModal user={user} onClose={() => setShowCreate(false)}
          onCreated={(g) => { setShowCreate(false); router.push(`/groups/${g.id}`) }} />
      )}
    </div>
  )
}

function EmptyState({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Users className="h-10 w-10 text-muted-foreground/30" />
      <p className="text-sm font-bold">{label}</p>
      <p className="text-[12px] text-muted-foreground">{hint}</p>
    </div>
  )
}

function GroupAvatar({ g }: { g: DBGroup }) {
  return (
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl overflow-hidden ${g.is_official ? "bg-blue-500/15" : "bg-secondary"}`}>
      {g.avatar_url ? <img src={g.avatar_url} alt="" className="h-full w-full object-cover" />
        : g.is_official ? <Building className="h-5 w-5 text-blue-400" />
        : <Users className="h-5 w-5 text-muted-foreground" />}
    </div>
  )
}

function GroupRow({ g, joined, joining, onOpen, onJoin }: {
  g: DBGroup; joined: boolean; joining: boolean; onOpen: () => void; onJoin: () => void
}) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl border bg-card p-3 ${g.is_official ? "border-blue-400/25" : "border-border"}`}>
      <button onClick={onOpen} className="flex items-center gap-3 min-w-0 flex-1 text-left">
        <GroupAvatar g={g} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-bold truncate">{g.name}</p>
            {g.is_official && <BadgeCheck className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
            {g.privacy === "private" ? <Lock className="h-3 w-3 text-muted-foreground shrink-0" /> : <Globe2 className="h-3 w-3 text-muted-foreground shrink-0" />}
          </div>
          {g.description && <p className="text-[11px] text-muted-foreground truncate">{g.description}</p>}
          <p className="text-[10px] text-muted-foreground mt-0.5">{g.member_count ?? 0} members{g.category ? ` · ${g.category}` : ""}</p>
        </div>
      </button>
      {joined ? (
        <button onClick={onOpen} className="shrink-0 rounded-xl bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-400">Open</button>
      ) : (
        <button onClick={onJoin} disabled={joining} className="shrink-0 rounded-xl bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-50">
          {joining ? "…" : g.privacy === "private" ? "Request" : "Join"}
        </button>
      )}
    </div>
  )
}

function CreateGroupModal({ user, onClose, onCreated }: {
  user: { id?: string; account_type?: string; role?: string }
  onClose: () => void; onCreated: (g: DBGroup) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("Companies")
  const [privacy, setPrivacy] = useState<"public" | "private">("public")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const willBeOfficial = user.account_type === "official" || user.role === "company" || user.role === "factory"

  const submit = async () => {
    if (!name.trim()) { setError("Add a group name"); return }
    setBusy(true); setError("")
    const g = await createGroup({
      owner_user_id: user.id!, name: name.trim(), description: description.trim() || undefined,
      category, privacy,
    })
    setBusy(false)
    if (g) onCreated(g)
    else setError("Could not create the group — try again")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-3xl border-t border-border bg-card p-4 pb-8 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold flex items-center gap-2"><Users className="h-4 w-4 text-amber-400" />Create Community</p>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        {error && <p className="rounded-lg bg-red-400/10 px-3 py-2 text-[12px] text-red-400">{error}</p>}
        {willBeOfficial && (
          <p className="flex items-center gap-1.5 rounded-lg bg-blue-400/10 px-3 py-2 text-[11px] text-blue-400">
            <BadgeCheck className="h-3.5 w-3.5" />This community will carry your Official verified badge
          </p>
        )}
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Community name" maxLength={60}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this community about?" rows={3} maxLength={280}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50 resize-none" />
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.filter(c => c !== "All").map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${category === c ? "bg-amber-400 text-black" : "border border-border text-muted-foreground"}`}>{c}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setPrivacy("public")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12px] font-bold ${privacy === "public" ? "bg-amber-400 text-black" : "border border-border text-muted-foreground"}`}>
            <Globe2 className="h-3.5 w-3.5" />Public
          </button>
          <button onClick={() => setPrivacy("private")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12px] font-bold ${privacy === "private" ? "bg-amber-400 text-black" : "border border-border text-muted-foreground"}`}>
            <Lock className="h-3.5 w-3.5" />Private
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground px-1">
          {privacy === "private" ? "New members must request to join and be approved." : "Anyone can join instantly."}
        </p>
        <button onClick={submit} disabled={busy} className="w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-black disabled:opacity-50">
          {busy ? "Creating…" : "Create Community"}
        </button>
      </div>
    </div>
  )
}
