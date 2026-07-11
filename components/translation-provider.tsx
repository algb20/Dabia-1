"use client"
import { useEffect } from "react"
import { usePathname } from "next/navigation"

// يُطبَّق على كل صفحة (مشترك عبر layout.tsx).
//
// ⚠️ إصلاح جذري حاسم: النسخة السابقة كانت تستدعي useTranslation() بالكامل
// هنا (نسخة كاملة ثانية من حالة الترجمة)، بينما app/page.tsx تستدعي أيضاً
// useTranslation() بشكل منفصل تماماً — هذا خلق نسختين متوازيتين تعملان
// على نفس DOM في نفس الوقت (Race Condition حقيقي)، تُسبب تلف شجرة DOM
// ويُعطّل React بالكامل (لا يفتح التطبيق). الحل: مصدر واحد فقط للحقيقة.
// هذا الملف الآن يطبّق فقط الكاش الجاهز على الصفحة الحالية دون امتلاك
// حالة (state) خاصة به أو استدعاء شبكة جديد — التطبيق الفعلي وتحديث
// الكاش يبقيان حصرياً من خلال useTranslation() في app/page.tsx.
const RTL_CODES = ["ar", "he", "fa", "ur"]

export default function TranslationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    try {
      const lang = localStorage.getItem("dabia_lang") || "en"
      document.documentElement.lang = lang
      document.documentElement.dir = RTL_CODES.includes(lang) ? "rtl" : "ltr"
      if (lang === "en") return

      const cacheRaw = localStorage.getItem(`dabia_dom_trans_${lang}`)
      if (!cacheRaw) return
      const cache: Record<string, string> = JSON.parse(cacheRaw)

      const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "INPUT", "TEXTAREA"])
      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const raw = node.textContent || ""
          if (raw && cache[raw]) node.textContent = cache[raw]
          return
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = (node as Element).tagName
          if (SKIP.has(tag)) return
          node.childNodes.forEach(walk)
        }
      }
      const timer = setTimeout(() => walk(document.body), 300)
      return () => clearTimeout(timer)
    } catch {}
  }, [pathname])

  return <>{children}</>
}
