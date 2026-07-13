"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useUserAuth } from "@/hooks/use-user-auth"
import { addProduct, updateProduct, getProductById, uploadProductImage, uploadProductVideo, type DBProduct } from "@/lib/dabia/db"
import {
  X, Package, Tag, DollarSign, Hash, AlignLeft,
  CheckCircle2, Loader2, AlertCircle, ImageIcon,
  Video, Box, Building, Factory, Store, Handshake, Briefcase, Users, Percent, Clock
} from "lucide-react"

import { Suspense } from "react"

const CATS = ["Electronics","Fashion","Accessories","Home","Health","Sports","Books","Food","Services","Art","Industrial","Other"]
const EMOJIS = ["📱","💻","👕","👟","🏠","⌚","🎸","📚","🍕","💄","🔧","🎮","💎","🏋️","🌿","🎯","🖼️","🔋","📷","🎁","🏭","📦"]

const ROLE_CONFIG: Record<string, { label:string; icon:any; fields:string[]; note:string }> = {
  merchant:         { label:"Merchant",        icon:Store,     fields:["images","video"],                   note:"Upload clear photos + demo video" },
  company:          { label:"Company",         icon:Building,  fields:["images","video","model3d","cert"],  note:"Add 3D preview and certifications" },
  factory:          { label:"Factory",         icon:Factory,   fields:["images","video","model3d","moq","cert"], note:"Specify MOQ and production certificates" },
  agent:            { label:"Agent",           icon:Handshake, fields:["images","video"],                   note:"Photos + video of represented products" },
  service_provider: { label:"Service",         icon:Briefcase, fields:["images","video","duration"],        note:"Show your work through photos/video" },
  partner:          { label:"Partner",         icon:Users,     fields:["images","video","model3d"],         note:"Full media for co-branded products" },
}

export default function AddProductPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-amber-400" /></div>}>
      <AddProductInner />
    </Suspense>
  )
}

function AddProductInner() {
  useDabiaTranslation() // يُفعِّل ترجمة هذه الصفحة الفرعية عند فتحها بأي لغة مختارة
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams?.get("edit")
  const { user } = useUserAuth()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const [loading,       setLoading]       = useState(false)
  const [loadingEdit,   setLoadingEdit]   = useState(!!editId)
  const [done,          setDone]          = useState(false)
  const [error,         setError]         = useState("")
  const [uploadingImg,  setUploadingImg]  = useState(false)
  const [uploadingVid,  setUploadingVid]  = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [uploadedVideo,  setUploadedVideo]  = useState("")

  const [form, setForm] = useState({
    name:"", description:"", price:"", originalPrice:"", category:"Electronics",
    stock:"1", emoji:"📱", model3dUrl:"", moq:"", cert:"", duration:"",
    dealEndsAt:"", dealLabel:""
  })
  const s = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setForm(f => ({...f,[k]:e.target.value}))

  // تحميل بيانات المنتج الحقيقية عند فتح وضع التعديل
  useEffect(() => {
    if (!editId) return
    getProductById(editId).then(p => {
      if (p) {
        setForm({
          name: p.name, description: p.description || "", price: String(p.price),
          originalPrice: p.original_price ? String(p.original_price) : "",
          category: p.category || "Electronics", stock: String(p.stock ?? 1),
          emoji: p.image && p.image.length <= 4 ? p.image : "📦",
          model3dUrl: "", moq: "", cert: "", duration: "",
          // datetime-local يتوقع صيغة محلية YYYY-MM-DDTHH:mm بدون منطقة زمنية
          dealEndsAt: p.deal_ends_at ? new Date(new Date(p.deal_ends_at).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "",
          dealLabel: p.deal_label || "",
        })
        if (p.images?.length) setUploadedImages(p.images)
        else if (p.image && p.image.startsWith("http")) setUploadedImages([p.image])
        if (p.video_url) setUploadedVideo(p.video_url)
      }
      setLoadingEdit(false)
    })
  }, [editId])


  if (loadingEdit) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
    </div>
  )

  if (!user) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <button onClick={() => router.push("/register")} className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black">Register</button>
    </div>
  )
  const cfg = ROLE_CONFIG[user.role ?? ""]
  if (!cfg) return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background gap-4 px-6 text-center">
      <Package className="h-12 w-12 text-muted-foreground/30" />
      <p className="text-sm font-bold">Merchant account required</p>
      <button onClick={() => router.push("/register")} className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black">Upgrade</button>
    </div>
  )
  if (user.status === "pending") return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background gap-4 px-6 text-center">
      <div className="text-5xl">⏳</div>
      <p className="text-sm font-bold">Account under review</p>
      <p className="text-[12px] text-muted-foreground">Can add products once approved (24-48h)</p>
      <button onClick={() => router.push("/account")} className="rounded-xl bg-amber-400 px-5 py-2 text-sm font-bold text-black">Check Status</button>
    </div>
  )

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !user.id) return
    setUploadingImg(true); setError("")
    try {
      const urls: string[] = []
      const errors: string[] = []
      for (const file of files.slice(0,5)) {
        const { url, error: uploadErr } = await uploadProductImage(file, user.id)
        if (url) urls.push(url)
        else if (uploadErr) errors.push(uploadErr)
      }
      setUploadedImages(prev => [...prev, ...urls])
      if (errors.length) setError(`Upload failed: ${errors[0]}`)
    } catch (e) { setError(e instanceof Error ? `Upload failed: ${e.message}` : "Image upload failed") }
    finally { setUploadingImg(false) }
  }

  // فحص حقيقي لمدة الفيديو — File لا يملك خاصية duration؛ يجب تحميله في
  // عنصر <video> فعلي لقراءة مدته الحقيقية. الفحص القديم كان معطّلاً تماماً.
  const getVideoDuration = (file: File): Promise<number> => new Promise((resolve, reject) => {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve(video.duration) }
    video.onerror = () => { URL.revokeObjectURL(video.src); reject(new Error("Could not read video file")) }
    video.src = URL.createObjectURL(file)
  })

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user.id) return
    setUploadingVid(true); setError("")
    try {
      const duration = await getVideoDuration(file)
      if (duration > 10) { setError("Video must be under 10 seconds"); return }
      const { url, error: uploadErr } = await uploadProductVideo(file, user.id)
      if (url) setUploadedVideo(url)
      else setError(uploadErr ? `Upload failed: ${uploadErr}` : "Video upload failed")
    } catch (e) { setError(e instanceof Error ? `Upload failed: ${e.message}` : "Video upload failed") }
    finally { setUploadingVid(false) }
  }

  const handleSubmit = async () => {
    if (!form.name)  { setError("Product name required"); return }
    if (!form.price || isNaN(+form.price) || +form.price <= 0) { setError("Valid price in π required"); return }
    if (form.originalPrice && +form.originalPrice <= +form.price) { setError("Original price must be higher than the discounted price"); return }
    setLoading(true); setError("")
    try {
      const descParts = [
        form.description.trim(),
        form.cert     ? `Cert: ${form.cert}` : "",
        form.moq      ? `MOQ: ${form.moq}` : "",
        form.duration ? `Duration: ${form.duration}` : "",
        form.model3dUrl ? `3D: ${form.model3dUrl}` : "",
      ].filter(Boolean)

      const payload: Partial<DBProduct> = {
        name:            form.name.trim(),
        description:     descParts.join(" · "),
        price:           parseFloat(form.price),
        original_price:  form.originalPrice ? parseFloat(form.originalPrice) : undefined,
        deal_ends_at:    form.dealEndsAt ? new Date(form.dealEndsAt).toISOString() : null as any,
        deal_label:      form.dealLabel.trim() || (form.dealEndsAt ? "Limited offer" : null as any),
        category:        form.category,
        image:           uploadedImages[0] || form.emoji,
        images:          uploadedImages.length ? uploadedImages : undefined,
        // الفيديو يُحفَظ الآن في حقله الحقيقي ليظهر المنتج في Reels (لا داخل الوصف)
        video_url:       uploadedVideo || null,
        stock:           parseInt(form.stock) || 1,
      }

      if (editId) {
        await updateProduct(editId, payload)
      } else {
        await addProduct({
          ...payload as DBProduct,
          seller_user_id: user!.id,
          seller_name:    user!.store_name || user!.username,
          rating:         0,
          review_count:   0,
        })
      }
      setDone(true)
    } catch (e) { setError(e instanceof Error ? e.message : "Failed") }
    finally { setLoading(false) }
  }

  if (done) return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background gap-4 px-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-400/10">
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
      </div>
      <h2 className="text-xl font-black">Product Published!</h2>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 text-[12px] space-y-1.5">
        <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-bold">{form.name}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-bold text-amber-400">{form.price}π</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Photos</span><span className="font-bold">{uploadedImages.length}</span></div>
        {uploadedVideo && <div className="flex justify-between"><span className="text-muted-foreground">Video</span><span className="font-bold text-emerald-400">✓ Uploaded</span></div>}
      </div>
      <div className="flex gap-3 w-full max-w-sm">
        <button onClick={() => { setDone(false); setForm({name:"",description:"",price:"",originalPrice:"",category:"Electronics",stock:"1",emoji:"📱",model3dUrl:"",moq:"",cert:"",duration:"",dealEndsAt:"",dealLabel:""}); setUploadedImages([]); setUploadedVideo("") }}
          className="flex-1 rounded-2xl border border-border py-3 text-sm font-bold active:scale-95">Add Another</button>
        <button onClick={() => router.push("/products/my")} className="flex-1 rounded-2xl bg-amber-400 py-3 text-sm font-bold text-black active:scale-95">My Products →</button>
      </div>
    </div>
  )

  const RoleIcon = cfg.icon
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <div className="flex-1">
          <p className="text-sm font-black">{editId ? "Edit Product / Service" : "Add Product / Service"}</p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1"><RoleIcon className="h-3 w-3" />{cfg.label} · {user.store_name || user.username}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
        {error && <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-[12px] text-red-400"><AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span></div>}

        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 flex items-center gap-2">
          <RoleIcon className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-[11px] text-amber-400">{cfg.note}</p>
        </div>

        {/* Emoji icon */}
        <div className="space-y-2">
          <label className="text-[12px] font-semibold text-muted-foreground">Icon (if no photo)</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setForm(f=>({...f,emoji:e}))} className={`h-10 w-10 rounded-xl text-xl transition-all active:scale-95 ${form.emoji===e?"bg-amber-400/20 border-2 border-amber-400":"bg-secondary border border-border"}`}>{e}</button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-muted-foreground">Name *</label>
          <div className="relative"><Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" value={form.name} onChange={s("name")} placeholder="Product / Service name"
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-muted-foreground">Short Description</label>
          <div className="relative"><AlignLeft className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <textarea value={form.description} onChange={s("description")} placeholder="Brief description..." rows={2} maxLength={200}
              className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:border-amber-400/50 resize-none" />
          </div>
        </div>

        {/* Price + Original price (discount) + Stock */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[12px] font-semibold text-muted-foreground">Price (π) *</label>
            <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="number" value={form.price} onChange={s("price")} placeholder="99" min="0.1" step="0.1"
                className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-semibold text-muted-foreground">Stock</label>
            <div className="relative"><Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="number" value={form.stock} onChange={s("stock")} placeholder="1" min="1"
                className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5"><Percent className="h-3.5 w-3.5 text-emerald-400" />Original Price — optional, shows a discount badge</label>
          <input type="number" value={form.originalPrice} onChange={s("originalPrice")} placeholder="Leave empty for no discount" min="0" step="0.1"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
          {form.originalPrice && +form.originalPrice > +form.price && form.price && (
            <p className="text-[11px] text-emerald-400 font-semibold">
              -{Math.round((1 - +form.price / +form.originalPrice) * 100)}% off — will show as a discount badge
            </p>
          )}
        </div>

        {/* عرض محدود بوقت — يتحكم به التاجر بالكامل ويظهر للمشترين بعدّاد */}
        <div className="space-y-2 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3">
          <label className="text-[12px] font-bold flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-400" />Limited-Time Offer <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Offer ends at</label>
            <input type="datetime-local" value={form.dealEndsAt} onChange={s("dealEndsAt")}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
          </div>
          {form.dealEndsAt && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Offer label</label>
              <input type="text" value={form.dealLabel} onChange={s("dealLabel")} maxLength={30} placeholder="Limited offer"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50" />
            </div>
          )}
          {form.dealEndsAt && new Date(form.dealEndsAt).getTime() > Date.now() && (
            <p className="text-[11px] text-amber-400 font-semibold">Buyers will see a live countdown until the offer ends</p>
          )}
          {form.dealEndsAt && (
            <button type="button" onClick={() => setForm(f => ({ ...f, dealEndsAt: "", dealLabel: "" }))}
              className="text-[11px] font-semibold text-red-400">Remove offer</button>
          )}
        </div>

        {/* Category */}
        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-muted-foreground">Category</label>
          <div className="relative"><Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select value={form.category} onChange={s("category")} className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:border-amber-400/50 appearance-none">
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Media — حسب نوع الحساب */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Professional Media</p>

          {/* صور — رفع حقيقي */}
          {cfg.fields.includes("images") && (
            <div className="space-y-2">
              <label className="text-[12px] font-semibold flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5 text-amber-400" />Photos (up to 5)</label>
              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              <button onClick={() => imageInputRef.current?.click()} disabled={uploadingImg}
                className="w-full rounded-xl border-2 border-dashed border-amber-400/30 py-4 text-[12px] text-amber-400 font-semibold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40">
                {uploadingImg ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</> : <><ImageIcon className="h-4 w-4" />Tap to upload photos</>}
              </button>
              {uploadedImages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {uploadedImages.map((url,i) => (
                    <img key={i} src={url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover border border-border" />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* فيديو — رفع حقيقي */}
          {cfg.fields.includes("video") && (
            <div className="space-y-2">
              <label className="text-[12px] font-semibold flex items-center gap-1.5"><Video className="h-3.5 w-3.5 text-amber-400" />Short Video (&lt;10s)</label>
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
              <button onClick={() => videoInputRef.current?.click()} disabled={uploadingVid}
                className="w-full rounded-xl border-2 border-dashed border-amber-400/30 py-4 text-[12px] text-amber-400 font-semibold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40">
                {uploadingVid ? <><Loader2 className="h-4 w-4 animate-spin" />Uploading…</> : uploadedVideo ? <><CheckCircle2 className="h-4 w-4 text-emerald-400" />Video uploaded ✓</> : <><Video className="h-4 w-4" />Tap to upload video</>}
              </button>
            </div>
          )}

          {/* 3D Model */}
          {cfg.fields.includes("model3d") && (
            <div className="space-y-1">
              <label className="text-[12px] font-semibold flex items-center gap-1.5"><Box className="h-3.5 w-3.5 text-amber-400" />3D Model URL (.glb)</label>
              <input type="url" value={form.model3dUrl} onChange={s("model3dUrl")} placeholder="https://model.glb"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-amber-400/50" />
            </div>
          )}

          {cfg.fields.includes("moq") && (
            <div className="space-y-1">
              <label className="text-[12px] font-semibold">Minimum Order Qty (MOQ)</label>
              <input type="number" value={form.moq} onChange={s("moq")} placeholder="e.g. 100"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-amber-400/50" />
            </div>
          )}

          {cfg.fields.includes("cert") && (
            <div className="space-y-1">
              <label className="text-[12px] font-semibold">Certification / Standard</label>
              <input type="text" value={form.cert} onChange={s("cert")} placeholder="ISO 9001, CE, etc."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-amber-400/50" />
            </div>
          )}

          {cfg.fields.includes("duration") && (
            <div className="space-y-1">
              <label className="text-[12px] font-semibold">Service Duration</label>
              <input type="text" value={form.duration} onChange={s("duration")} placeholder="e.g. 2 hours, 3 days"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] outline-none focus:border-amber-400/50" />
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-secondary text-3xl">
            {uploadedImages[0] ? <img src={uploadedImages[0]} alt="" className="h-full w-full object-cover" /> : form.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{form.name||"Product name…"}</p>
            <p className="text-[11px] text-muted-foreground truncate">{form.description||form.category}</p>
            <p className="text-amber-400 font-black text-sm mt-0.5">{form.price?`${form.price}π`:"—π"}</p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur p-4">
        <button onClick={handleSubmit} disabled={loading||!form.name||!form.price}
          className="w-full rounded-2xl bg-amber-400 py-3.5 text-sm font-bold text-black disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />{editId ? "Saving…" : "Publishing…"}</> : (editId ? "✓ Save Changes" : "✓ Publish Product")}
        </button>
      </div>
    </div>
  )
}
