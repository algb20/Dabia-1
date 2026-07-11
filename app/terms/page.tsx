"use client"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
export default function TermsPage() {
  const router = useRouter()
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black">Terms & Conditions</p>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {[
          ["1. Acceptance","By using Dabia, you agree to these Terms. If you disagree, please do not use the platform."],
          ["2. Pi Network","Dabia operates on Pi Network. You must have a valid Pi account. All transactions use Pi (π)."],
          ["3. User Accounts","You are responsible for all activity on your account. Provide accurate information during registration."],
          ["4. Merchants","Merchants must provide truthful product listings. False information may result in account suspension."],
          ["5. Prohibited","Fraud, illegal activities, harassment, IP infringement, or any unlawful use is strictly prohibited."],
          ["6. Liability","Dabia is provided as-is. We are not liable for indirect or consequential damages."],
          ["7. Changes","We may update these Terms at any time. Continued use constitutes acceptance."],
          ["8. Contact","For questions: support@dabia.app"],
        ].map(([title, text]) => (
          <div key={title} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-sm font-bold text-amber-400">{title}</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{text}</p>
          </div>
        ))}
        <button onClick={() => router.back()} className="w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-black active:scale-95">✓ I Agree</button>
      </div>
    </div>
  )
}
