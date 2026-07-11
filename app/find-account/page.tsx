"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { searchAccounts, type AccountSearchResult } from "@/lib/dabia/db"
import { X, Search, Loader2, BadgeCheck, Store, User, KeyRound } from "lucide-react"

export default function FindAccountPage() {
  useDabiaTranslation()
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AccountSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true); setSearched(true)
    const r = await searchAccounts(query.trim())
    setResults(r)
    setLoading(false)
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <div><p className="text-sm font-black">Find Your Account</p><p className="text-[11px] text-muted-foreground">Search by username, store name, or Pi ID</p></div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearch()}
              placeholder="Username, store name or Pi UID"
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
          </div>
          <button onClick={handleSearch} disabled={loading || !query.trim()} className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </button>
        </div>

        {searched && !loading && (
          results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <User className="h-10 w-10 opacity-30" />
              <p className="text-[12px]">No account found. Try a different name or create a new account.</p>
              <Link href="/register" className="mt-2 text-[12px] font-bold text-amber-400">Create Account →</Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">{results.length} account(s) found</p>
              {results.map(r => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-sm font-black text-black overflow-hidden">
                    {r.avatar_url ? <img src={r.avatar_url} alt="" className="h-full w-full object-cover" /> : r.username[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold truncate flex items-center gap-1">{r.username}{r.pi_uid && <BadgeCheck className="h-3.5 w-3.5 text-amber-400" />}</p>
                    {r.store_name && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Store className="h-3 w-3" />{r.store_name}</p>}
                    <p className="text-[10px] text-muted-foreground">{r.emallMasked}</p>
                  </div>
                  <Link href={`/forgot-password?email=${encodeURIComponent(r.emallMasked)}`} className="shrink-0 flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-400">
                    <KeyRound className="h-3 w-3" />Reset
                  </Link>
                </div>
              ))}
            </div>
          )
        )}

        {!searched && (
          <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Search className="h-10 w-10 opacity-20" />
            <p className="text-[12px]">Search to find your existing account</p>
          </div>
        )}
      </div>
    </div>
  )
}
