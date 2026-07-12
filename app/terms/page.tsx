"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useRouter } from "next/navigation"
import { X, ShieldAlert } from "lucide-react"

const SECTIONS: [string, string][] = [
  ["1. Acceptance of Terms",
   "By accessing or using Dabia (\"the Platform\"), you agree to be bound by these Terms & Conditions and our Privacy Policy. If you do not agree, do not use the Platform. You must be of legal age in your country to enter binding contracts."],
  ["2. Dabia is a Marketplace, not the Seller",
   "Dabia is an online marketplace that connects independent buyers and sellers (merchants, companies, factories, agents and service providers). Dabia does not manufacture, own, sell, store, ship, or inspect any product or service listed. Each transaction is a direct contract between the buyer and the seller. Dabia is not a party to that contract and is not responsible for the existence, quality, safety, legality, or delivery of any item, nor for the truthfulness of any listing. Sellers are solely responsible for their listings, products, pricing, fulfilment and compliance with applicable law."],
  ["3. Pi Network & Payments",
   "The Platform runs inside Pi Browser and uses Pi (π) for payments through the Pi Network payment system. You must hold a valid Pi account. You are responsible for the accuracy of payment details and for any network or transaction fees. Payments are processed and confirmed by Pi Network; Dabia does not custody your Pi wallet keys."],
  ["4. Accounts & Eligibility",
   "You are responsible for all activity under your account and for keeping your credentials secure. You must provide accurate registration information. Merchant, company, factory, agent and partner accounts may be reviewed before activation and may be suspended for false information."],
  ["5. Orders, Shipping & Delivery",
   "When you place an order you enter a binding purchase contract with the seller. The seller is responsible for preparing, shipping and delivering the order, for providing tracking information, and for honouring the delivery terms shown at checkout. Shipping times, costs and methods are set and fulfilled by the seller."],
  ["6. Returns, Refunds & Disputes",
   "Return, refund and cancellation terms are primarily set by each seller and must be stated fairly. Buyers should confirm receipt only after inspecting the order. If a dispute arises, buyer and seller must first attempt to resolve it directly through the order. Dabia may, at its discretion, provide mediation tools but is not obligated to refund, reimburse, or take the place of either party. See our Refund & Shipping Policy for details."],
  ["7. Prohibited Conduct",
   "You may not use the Platform for fraud, counterfeit or illegal goods, money laundering, harassment, intellectual-property infringement, circumventing security, scraping, or any unlawful purpose. Violations may result in immediate suspension and reporting to authorities."],
  ["8. Live Streaming & User Content",
   "Merchants may broadcast live and post content. You are responsible for content you publish and grant Dabia a licence to display it within the Platform. Content that is illegal, deceptive, or infringing is prohibited and may be removed."],
  ["9. Limitation of Liability",
   "The Platform is provided \"as is\" and \"as available\" without warranties of any kind. To the maximum extent permitted by law, Dabia and its operators are not liable for any indirect, incidental, special or consequential damages, or for any loss arising from transactions between users, product defects, non-delivery, or third-party services (including Pi Network). Your sole remedy for dissatisfaction is to stop using the Platform."],
  ["10. Indemnity",
   "You agree to indemnify and hold Dabia harmless from any claim or demand arising out of your use of the Platform, your listings or content, or your breach of these Terms or applicable law."],
  ["11. Suspension & Termination",
   "We may suspend or terminate accounts that violate these Terms. You may close your account at any time; certain records may be retained as required by law (see Privacy Policy)."],
  ["12. Changes & Governing Law",
   "We may update these Terms; continued use constitutes acceptance. These Terms are governed by the applicable laws of the seller's and buyer's jurisdiction to the extent required. Where a mandatory consumer-protection law applies, nothing here limits your statutory rights."],
  ["13. Contact",
   "Questions about these Terms: support@dabia.app"],
]

export default function TermsPage() {
  useDabiaTranslation()
  const router = useRouter()
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black">Terms &amp; Conditions</p>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        <p className="text-[11px] text-muted-foreground">Last updated: {new Date().getFullYear()}. Please read these Terms carefully before using Dabia.</p>

        <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/5 p-3">
          <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Dabia is a marketplace that connects buyers and sellers. It is not the seller, manufacturer or shipper of any item. Each purchase is a direct contract between buyer and seller.
          </p>
        </div>

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
