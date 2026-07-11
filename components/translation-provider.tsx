"use client"
import { useEffect } from "react"
import { startTranslationEngine } from "@/hooks/use-translation"

// مثبَّت في layout.tsx فوق كل الصفحات: يشغّل محرّك الترجمة العالمي الوحيد
// مرة واحدة. المحرّك نفسه (hooks/use-translation.ts) يراقب DOM كاملاً عبر
// MutationObserver ويترجم أي نص جديد تلقائياً في كل الصفحات، فلا حاجة لأي
// منطق لكل مسار هنا ولا لأي استدعاء يدوي من الصفحات.
export default function TranslationProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => { startTranslationEngine() }, [])
  return <>{children}</>
}
