"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserAuth } from "@/hooks/use-user-auth"
import { getSavedProducts, toggleSaveProduct, type DBProduct } from "@/lib/dabia/db"
import { X, Loader2, Bookmark, BookmarkX } from "lucide-react"

export default function SavedProductsPage() {
  useDabiaTranslation()
  const router = useRouter()
  const { user } = useUserAuth()
  const [products, setProducts] = useState<DBProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    getSavedProducts(user.id).then(setProducts).finally(() => setLoading(false))
  }, [user?.id])

  if (!user) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <button onClick={() => router.push("/register")} className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black">Sign In</button>
    </div>
  )

  const handleRemove = async (id: string) => {
    await toggleSaveProduct(user.id!, id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black flex-1">Saved Products</p>
        <span className="text-[11px] text-muted-foreground">{products.length} saved</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <Bookmark className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-bold">No saved products yet</p>
            <p className="text-[12px] text-muted-foreground">Tap the bookmark icon on any product to save it here</p>
          </div>
        ) : products.map(p => (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl overflow-hidden">
              {p.image?.startsWith("http") ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : (p.image || "📦")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold truncate">{p.name}</p>
              <p className="text-amber-400 font-black text-sm">{p.price}π</p>
            </div>
            <button onClick={() => handleRemove(p.id!)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/5">
              <BookmarkX className="h-4 w-4 text-red-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
