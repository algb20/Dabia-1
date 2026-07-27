"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getProductById, type DBProduct } from "@/lib/dabia/db"
import { Loader2, X } from "lucide-react"

// صفحة رابط مباشر للمنتج — تُعيد توجيه المستخدم للصفحة الرئيسية مع فتح المنتج
// المطلوب تلقائياً، بدل فتح صفحة منتج منفصلة (يحافظ على تصميم التطبيق نفسه)
export default function ProductDeepLinkPage() {
  useDabiaTranslation()
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    getProductById(id).then(p => {
      if (p) {
        // نوحّد على رابط الجذر مع المعامل ?p= حتى تعمل بوّابة "افتح في Pi Browser"
        router.replace(`/?p=${encodeURIComponent(id)}`)
      } else {
        setNotFound(true)
      }
    })
  }, [id, router])

  if (notFound) return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background text-center px-6">
      <X className="h-10 w-10 text-muted-foreground/40" />
      <p className="text-sm font-bold">This product is no longer available</p>
      <button onClick={() => router.push("/")} className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-black">Go to Dabia</button>
    </div>
  )

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
    </div>
  )
}
