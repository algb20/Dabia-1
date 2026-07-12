"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

const SECTIONS: [string, string][] = [
  ["1. Who We Are",
   "Dabia is a marketplace operating inside Pi Browser. This policy explains what personal data we process, why, and your rights over it."],
  ["2. Data We Collect",
   "Account data (username, email, phone, country, Pi UID), profile data (avatar, bio, store details), and transaction data (orders, shipping address, order status, wallet activity). We also process content you create (posts, reviews, comments, live streams) and technical data such as approximate country detected from your IP for localisation."],
  ["3. How We Use Your Data",
   "To create and secure your account, process orders and payments through Pi Network, enable shipping and order tracking between buyer and seller, personalise the experience, prevent fraud and abuse, and comply with legal obligations."],
  ["4. Legal Basis",
   "We process data to perform the contract you enter when using the Platform, for our legitimate interest in operating a safe marketplace, for compliance with law, and — where required — with your consent (which you give at registration)."],
  ["5. Sharing",
   "We do not sell your personal data. We share the minimum necessary: your shipping details are shared with the seller of your order so it can be delivered; payment identifiers are shared with Pi Network to process payments. Service providers that help run the Platform process data on our behalf under confidentiality."],
  ["6. Security",
   "Passwords are stored only as strong salted hashes (PBKDF2), never in plain text. Sensitive account fields (wallet balance, role, status) can only be changed by the system, not directly from a client. Payments are handled by Pi Network; we never hold your wallet keys. No system is perfectly secure, so please keep your credentials safe."],
  ["7. Data Retention",
   "We keep account and transaction records for as long as your account is active and as required by law (e.g. for tax, accounting and dispute resolution). When you delete your account we remove or anonymise personal data that we are not legally required to keep."],
  ["8. Your Rights",
   "Subject to applicable law you may access, correct, export, or delete your data, and object to or restrict certain processing. You can edit your profile in settings and delete your account from account settings. To exercise other rights, contact privacy@dabia.app."],
  ["9. International Users",
   "The Platform is available globally. By using it you understand your data may be processed in countries with different data-protection laws; we apply the protections described here regardless."],
  ["10. Children",
   "The Platform is not intended for anyone below the legal age to transact in their country. We do not knowingly collect data from children."],
  ["11. Changes",
   "We may update this policy; material changes will be reflected here with a new date. Continued use after an update constitutes acceptance."],
  ["12. Contact",
   "Privacy questions or requests: privacy@dabia.app"],
]

export default function PrivacyPage() {
  useDabiaTranslation()
  const router = useRouter()
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black">Privacy Policy</p>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        <p className="text-[11px] text-muted-foreground">Last updated: {new Date().getFullYear()}.</p>
        {SECTIONS.map(([title, text]) => (
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
