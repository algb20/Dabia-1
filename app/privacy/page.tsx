"use client"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
export default function PrivacyPage() {
  const router = useRouter()
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black">Privacy Policy</p>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {[
          ["1. Data We Collect","Username, email, phone, country, Pi UID, and transaction data."],
          ["2. How We Use It","To process transactions, improve services, prevent fraud, and comply with law."],
          ["3. Security","Industry-standard encryption protects your data at rest and in transit."],
          ["4. Sharing","We never sell your data. We only share data required by Pi Network for payments."],
          ["5. Your Rights","You can access, modify, or delete your data at any time via account settings."],
          ["6. Cookies","We use minimal cookies for session management only."],
          ["7. Contact","privacy@dabia.app"],
        ].map(([title, text]) => (
          <div key={title} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-sm font-bold text-amber-400">{title}</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{text}</p>
          </div>
        ))}
        <button onClick={() => router.back()} className="w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-black active:scale-95">✓ I Understand</button>
      </div>
    </div>
  )
}
