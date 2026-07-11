"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useUserAuth } from "@/hooks/use-user-auth"
import { uploadProfilePicture } from "@/lib/dabia/db"

// ضغط الصورة على المتصفح قبل الرفع — يحل مشاكل "لا تتوفر مساحة" من صور الكاميرا الكبيرة (10-20MB+)
async function compressImage(file: File, maxSize = 800): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = (e) => { img.src = e.target?.result as string }
    reader.onerror = () => reject(new Error("Could not read the image file"))
    img.onload = () => {
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize }
        else { width = Math.round((width * maxSize) / height); height = maxSize }
      }
      const canvas = document.createElement("canvas")
      canvas.width = width; canvas.height = height
      const ctx = canvas.getContext("2d")
      if (!ctx) { resolve(file); return } // تراجع آمن للملف الأصلي إن فشل الـ canvas
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }))
        },
        "image/jpeg", 0.82
      )
    }
    img.onerror = () => reject(new Error("This file is not a valid image"))
    reader.readAsDataURL(file)
  })
}
import {
  X, Camera, Loader2, AlertCircle, CheckCircle2,
  Globe, AlignLeft, Save, ImageIcon, Pin, ExternalLink, Sparkles
} from "lucide-react"
import { getIdentityFields } from "@/lib/dabia/identity-fields"

export default function EditProfilePage() {
  useDabiaTranslation() // يُفعِّل ترجمة هذه الصفحة الفرعية عند فتحها بأي لغة مختارة
  const router = useRouter()
  const { user, updateProfile } = useUserAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const [showPhotoMenu, setShowPhotoMenu] = useState(false)

  const [avatarUrl,  setAvatarUrl]  = useState(user?.avatar_url || "")
  const [bio,        setBio]        = useState(user?.bio || "")
  const [websiteUrl, setWebsiteUrl] = useState(user?.website_url || "")
  const identityFields = getIdentityFields(user?.role)
  const [identityCard, setIdentityCard] = useState<Record<string, string>>({})

  // إعادة تحميل القيم فور اكتمال تحميل بيانات المستخدم الحقيقية (يحل مشكلة الحقول الفارغة عند الرجوع)
  useEffect(() => {
    if (!user) return
    setAvatarUrl(user.avatar_url || "")
    setBio(user.bio || "")
    setWebsiteUrl(user.website_url || "")
    const saved = (user.profile?.identity_card || {}) as Record<string, string | string[]>
    const flat: Record<string, string> = {}
    for (const f of getIdentityFields(user.role)) {
      const v = saved[f.key]
      flat[f.key] = Array.isArray(v) ? v.join(", ") : (v || "")
    }
    setIdentityCard(flat)
  }, [user?.id, user?.avatar_url, user?.bio, user?.website_url, user?.role])
  const [uploading,  setUploading]  = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState("")

  if (!user) return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <button onClick={() => router.push("/register")} className="rounded-2xl bg-amber-400 px-6 py-3 text-sm font-bold text-black">Sign In</button>
    </div>
  )

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user.id) return
    setUploading(true); setError("")
    try {
      const compressed = await compressImage(file)
      const { url, error: uploadErr } = await uploadProfilePicture(compressed, user.id)
      if (url) setAvatarUrl(url)
      else setError(uploadErr || "Upload failed for an unknown reason")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not access this image. Try a different photo.")
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true); setError("")
    try {
      const identity_card: Record<string, string | string[]> = {}
      for (const f of identityFields) {
        const raw = (identityCard[f.key] || "").trim()
        if (!raw) continue
        identity_card[f.key] = f.isList ? raw.split(",").map(s => s.trim()).filter(Boolean) : raw
      }
      await updateProfile({
        avatar_url:  avatarUrl  || undefined,
        bio:         bio.trim() || undefined,
        website_url: websiteUrl.trim() || undefined,
        profile:     { ...(user.profile || {}), identity_card },
      })
      setSaved(true)
      setTimeout(() => { setSaved(false); router.back() }, 1200)
    } catch {
      setError("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black flex-1">Edit Identity Card</p>
        <button onClick={handleSave} disabled={saving}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 ${saved ? "bg-emerald-400 text-black" : "bg-amber-400 text-black"}`}>
          <Save className="h-3.5 w-3.5" />
          {saving ? "Saving…" : saved ? "Saved!" : "Save"}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-10">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2.5 text-[12px] text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
          </div>
        )}

        {/* صورة البروفايل */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-amber-600 text-3xl font-black text-black overflow-hidden">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                : (user.username || "U")[0].toUpperCase()
              }
            </div>
            <button onClick={() => setShowPhotoMenu(true)} disabled={uploading}
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 border-2 border-background active:scale-95 disabled:opacity-50">
              {uploading ? <Loader2 className="h-4 w-4 text-black animate-spin" /> : <Camera className="h-4 w-4 text-black" />}
            </button>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAvatarChange} />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* قائمة اختيار: كاميرا أم معرض الصور — تحل مشكلة عدم ظهور خيار الكاميرا */}
          {showPhotoMenu && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setShowPhotoMenu(false)}>
              <div className="w-full max-w-lg rounded-t-3xl bg-card p-4 pb-8 space-y-2" onClick={e => e.stopPropagation()}>
                <button onClick={() => { setShowPhotoMenu(false); cameraInputRef.current?.click() }}
                  className="w-full flex items-center gap-3 rounded-xl border border-border px-4 py-3 active:scale-95">
                  <Camera className="h-4 w-4 text-amber-400" /><span className="text-sm font-semibold">Take Photo</span>
                </button>
                <button onClick={() => { setShowPhotoMenu(false); fileInputRef.current?.click() }}
                  className="w-full flex items-center gap-3 rounded-xl border border-border px-4 py-3 active:scale-95">
                  <ImageIcon className="h-4 w-4 text-amber-400" /><span className="text-sm font-semibold">Choose from Gallery</span>
                </button>
                <button onClick={() => setShowPhotoMenu(false)}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-muted-foreground">Cancel</button>
              </div>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Tap the camera to upload or change your photo</p>
        </div>

        {/* نبذة عن الحساب */}
        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <AlignLeft className="h-3.5 w-3.5" />Bio / Short Description
          </label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            placeholder={
              user.role === "buyer"
                ? "Tell others a bit about yourself…"
                : "Describe your business, what you sell, and what makes you trustworthy…"
            }
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50 resize-none"
          />
          <p className="text-[10px] text-muted-foreground text-right">{bio.length}/160</p>
        </div>

        {/* رابط الموقع — اختياري لكل أنواع الحسابات */}
        <div className="space-y-1">
          <label className="text-[12px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />Website / Store Link (optional)
          </label>
          <input
            type="url"
            value={websiteUrl}
            onChange={e => setWebsiteUrl(e.target.value)}
            placeholder="https://yourbusiness.com"
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50"
          />
        </div>

        {/* حقول بطاقة الهوية الإضافية — تختلف حسب نوع الحساب */}
        {identityFields.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />Identity Card Details
            </p>
            {identityFields.map(f => (
              <div key={f.key} className="space-y-1">
                <label className="text-[12px] font-semibold text-muted-foreground">
                  {f.label}{f.isList && <span className="text-muted-foreground/60"> (comma separated)</span>}
                </label>
                <input
                  type="text"
                  value={identityCard[f.key] || ""}
                  onChange={e => setIdentityCard(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-amber-400/50"
                />
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">These details appear publicly on your store page.</p>
          </div>
        )}

        {/* معاينة مباشرة لكيف ستظهر البطاقة */}
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 space-y-2">
          <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Live Preview</p>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-lg font-black text-black overflow-hidden">
              {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : (user.username || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{user.username}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{user.role?.replace("_"," ")}</p>
            </div>
          </div>
          {bio && <p className="text-[12px] text-muted-foreground">{bio}</p>}
          {websiteUrl && <p className="text-[11px] text-amber-400 truncate">{websiteUrl}</p>}
        </div>
      </div>
    </div>
  )
}
