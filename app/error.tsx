"use client"
import { useEffect } from "react"

// ═══════════════════════════════════════════════════════════════════════════════
// Error Boundary رسمي لـ Next.js App Router — يُفعَّل تلقائياً عند أي خطأ JavaScript
// غير متوقع في أي مكان بالتطبيق، ويعرض شاشة واضحة بدل الشاشة السوداء الفارغة
// ═══════════════════════════════════════════════════════════════════════════════
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // تسجيل الخطأ الحقيقي في console المتصفح لتسهيل التشخيص لاحقاً
    console.error("Dabia runtime error:", error)
  }, [error])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0a0a0a] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-red-400/20 bg-red-400/10">
        <span className="text-3xl">⚠️</span>
      </div>
      <h2 className="text-lg font-black text-white">Something went wrong</h2>
      <p className="max-w-xs text-[13px] text-gray-400 leading-relaxed">
        An unexpected error occurred. This has been logged. You can try again or go back to the home screen.
      </p>
      {error?.message && (
        <p className="max-w-xs rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-gray-500 font-mono break-words">
          {error.message}
        </p>
      )}
      <div className="flex w-full max-w-xs gap-2 pt-2">
        <button onClick={() => reset()}
          className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-bold text-white active:scale-95 transition-transform">
          Try Again
        </button>
        <button onClick={() => { window.location.href = "/" }}
          className="flex-1 rounded-2xl bg-amber-400 py-3 text-sm font-bold text-black active:scale-95 transition-transform">
          Go Home
        </button>
      </div>
    </div>
  )
}
