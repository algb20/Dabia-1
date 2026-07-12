"use client"
import { useTranslation as useDabiaTranslation } from "@/hooks/use-translation"
import { useRouter } from "next/navigation"
import { X, Truck, RotateCcw, Scale } from "lucide-react"

const SECTIONS: [string, string][] = [
  ["1. Marketplace Model",
   "Dabia connects buyers with independent sellers. Shipping and refunds are primarily the responsibility of the seller you purchased from. The terms below set the baseline fairness rules that all sellers on Dabia must respect."],
  ["2. Shipping",
   "Sellers must ship orders within a reasonable time after payment is confirmed, mark the order as Shipped, and provide a carrier and tracking number where available. Estimated delivery times, shipping methods and any shipping fees are set by the seller and shown before you pay. Ownership of shipping obligations stays with the seller."],
  ["3. Order Tracking",
   "Every order has a unique order number and a live status timeline (Placed → Confirmed → Preparing → Shipped → Delivered). Buyers can follow their orders in Profile → My Orders and should keep the order number for reference."],
  ["4. Confirming Receipt",
   "An order is completed when the buyer confirms receipt after inspecting the item. Please confirm receipt only once you have received and checked your order. If you do not receive an order that was marked shipped, contact the seller through the order first."],
  ["5. Returns & Refunds",
   "Each seller sets fair return and refund terms (e.g. for items that are not as described, damaged, or not delivered). A refund request should be raised promptly. Where a seller's stated policy or a mandatory consumer-protection law grants you a refund, the seller must honour it. Digital goods and services may be non-returnable where clearly stated before purchase."],
  ["6. Cancellations",
   "Orders may be cancelled before they are shipped, subject to the seller's policy. Once shipped, the return/refund process applies instead."],
  ["7. Disputes",
   "If buyer and seller cannot resolve an issue directly, Dabia may offer mediation tools to help reach a fair outcome. Dabia is a neutral marketplace, not a party to the sale, and does not guarantee, fund, or replace refunds owed by a seller — but it may act against sellers who repeatedly breach these rules, including suspension."],
  ["8. Fraud & Chargebacks",
   "Payments are processed by Pi Network. Fraudulent claims, abuse of refunds, or attempts to obtain goods without paying may lead to account suspension and reporting."],
  ["9. Contact",
   "Order or refund help: support@dabia.app"],
]

export default function RefundPolicyPage() {
  useDabiaTranslation()
  const router = useRouter()
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 pt-safe backdrop-blur">
        <button onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border active:scale-95"><X className="h-4 w-4" /></button>
        <p className="text-sm font-black">Refund &amp; Shipping Policy</p>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center">
            <Truck className="h-5 w-5 text-amber-400" /><span className="text-[10px] font-bold">Shipping</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center">
            <RotateCcw className="h-5 w-5 text-amber-400" /><span className="text-[10px] font-bold">Refunds</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-3 text-center">
            <Scale className="h-5 w-5 text-amber-400" /><span className="text-[10px] font-bold">Fair disputes</span>
          </div>
        </div>
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
