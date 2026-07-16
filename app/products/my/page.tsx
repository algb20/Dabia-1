"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUserAuth } from "@/hooks/use-user-auth"
import { getProductsBySeller, deleteProduct, toggleProductActive, getOrdersBySeller, type DBProduct, type DBOrder } from "@/lib/dabia/db"
import { X, Plus, Package, Trash2, Star, Archive, Loader2, AlertCircle, Edit3, EyeOff, Eye, ClipboardList, TrendingUp } from "lucide-react"

export default function MyProductsPage() {
  useDabiaTranslation()
  const router = useRouter()
  const { user } = useUserAuth()
  const [products, setProducts] = useState<DBProduct[]>([])
  const [orders,   setOrders]   = useState<DBOrder[]>([])
  const [loading,  setLoading]  = useState(true)
  const [deleting, setDeleting] = useState<string|null>(null)
  const [toggling, setToggling] = useState<string|null>(null)
  const [error,    setError]    = useState("")

  useEffect(() => {
    if (!user?.id) { setLoading(false); return }
    Promise.all([getProductsBySeller(user.id), getOrdersBySeller(user.id)])
      .then(([p, o]) => { setProducts(p); setOrders(o) })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false))
  }, [user?.id])

  if (!user) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <button onClick={() => router.push("/register")} className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black">Sign In</button>
    </div>
  )

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product permanently?")) return
    setDeleting(id)
    try { await deleteProduct(id); setProducts(p => p.filter(x => x.id !== id)) }
    catch { setError("Delete failed") }
    finally { setDeleting(null) }
  }

  const handleToggleActive = async (p: DBProduct) => {
    setToggling(p.id!)
    const ok = await toggleProductActive(p.id!, !p.active)
    if (ok) setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: !p.active } : x))
    setToggling(null)
  }

  const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "confirmed").length
  const totalRevenue  = orders.filter(o => o.status !== "cancelled" && o.status !== "refunded").reduce((s, o) => s + (o.total_price || 0), 0)

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <div className="flex-1"><p className="text-sm font-black">My Store</p><p className="text-[11px] text-muted-foreground">{products.length} listed</p></div>
        <button onClick={() => router.push("/products/add")} className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-3 py-1.5 text-[12px] font-bold text-black active:scale-95">
          <Plus className="h-3.5 w-3.5" />Add
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {error && <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-[12px] text-red-400"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}

        {!loading && (
          <div className="grid grid-cols-2 gap-3">
            <Link href="/orders/seller" className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3.5 flex items-center gap-2.5">
              <ClipboardList className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-lg font-black">{pendingOrders}</p>
                <p className="text-[10px] text-muted-foreground">Pending orders</p>
              </div>
            </Link>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-3.5 flex items-center gap-2.5">
              <TrendingUp className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-lg font-black">{totalRevenue.toLocaleString()}π</p>
                <p className="text-[10px] text-muted-foreground">Total revenue</p>
              </div>
            </div>
          </div>
        )}

        {loading ? Array.from({length:3}).map((_,i) => <div key={i} className="h-20 rounded-2xl bg-secondary/40 animate-pulse" />) :
         products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary"><Archive className="h-10 w-10 text-muted-foreground/30" /></div>
            <p className="text-sm font-bold">No products yet</p>
            <button onClick={() => router.push("/products/add")} className="flex items-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black active:scale-95">
              <Plus className="h-4 w-4" />Add Product
            </button>
          </div>
         ) : products.map(p => (
          <div key={p.id} className={`rounded-2xl border bg-card p-4 space-y-2.5 ${p.active === false ? "border-border opacity-60" : "border-border"}`}>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-secondary text-3xl overflow-hidden">
                {p.image?.startsWith("http") ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : (p.image || "📦")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{p.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{p.description || p.category}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-amber-400 font-black text-sm">{p.price}π</span>
                  {p.original_price && p.original_price > p.price && (
                    <>
                      <span className="text-[10px] text-muted-foreground line-through">{p.original_price}π</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">-{Math.round((1 - p.price / p.original_price) * 100)}%</span>
                    </>
                  )}
                  <span className="text-[10px] text-muted-foreground">Stock: {p.stock}</span>
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Eye className="h-3 w-3" />{p.view_count ?? 0} views</span>
                  {(p.review_count??0)>0 && <span className="text-[10px] text-muted-foreground">{p.review_count} sold</span>}
                  {(p.rating??0)>0 && <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{p.rating}</span>}
                  {p.active === false && <span className="text-[9px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">Hidden</span>}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/products/add?edit=${p.id}`} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-[12px] font-bold active:scale-95">
                <Edit3 className="h-3.5 w-3.5" />Edit
              </Link>
              <button onClick={() => handleToggleActive(p)} disabled={toggling === p.id}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-[12px] font-bold active:scale-95 disabled:opacity-40">
                {toggling === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : p.active === false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {p.active === false ? "Show" : "Hide"}
              </button>
              <button onClick={() => handleDelete(p.id!)} disabled={deleting===p.id}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/5 active:scale-95 disabled:opacity-40">
                {deleting===p.id ? <Loader2 className="h-3.5 w-3.5 text-red-400 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-red-400" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
