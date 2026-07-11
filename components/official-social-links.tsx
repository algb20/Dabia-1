"use client"
import { useEffect, useState } from "react"
import { getOfficialLinks, type OfficialLink } from "@/lib/dabia/db"
import { Facebook, Instagram, Twitter, Send, Youtube } from "lucide-react"

// أيقونة TikTok مخصّصة — lucide-react لا يوفّر أيقونة رسمية لها
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82c-.9-.6-1.5-1.6-1.66-2.82h-3.07v12.4a2.59 2.59 0 1 1-1.83-2.48V9.84a5.6 5.6 0 0 0-.76-.05A5.59 5.59 0 1 0 14.87 15V9.36a7.3 7.3 0 0 0 4.27 1.37V7.66s-1.65.07-2.54-1.84Z"/>
    </svg>
  )
}

const ICONS: Record<OfficialLink["platform"], any> = {
  facebook: Facebook, instagram: Instagram, x: Twitter, telegram: Send, youtube: Youtube, tiktok: TikTokIcon,
}
const LABELS: Record<OfficialLink["platform"], string> = {
  facebook: "Facebook", instagram: "Instagram", x: "X", telegram: "Telegram", youtube: "YouTube", tiktok: "TikTok",
}

// يُعرض لكل الزوار والمستخدمين (لا يتطلب تسجيل دخول) — يجلب الحالة الحية من
// Supabase، فتفعيل/تعطيل/تغيير رابط أي منصة من Table Editor ينعكس فوراً هنا
// دون أي حاجة لإعادة نشر التطبيق.
export default function OfficialSocialLinks() {
  const [links, setLinks] = useState<OfficialLink[] | null>(null)

  useEffect(() => {
    getOfficialLinks().then(setLinks)
  }, [])

  const active = (links || []).filter(l => l.enabled && l.url?.trim())
  if (!links || active.length === 0) return null

  return (
    <div className="space-y-2 text-center">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Follow Dabia</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {active.map(l => {
          const Icon = ICONS[l.platform]
          return (
            <a key={l.platform} href={l.url} target="_blank" rel="noopener noreferrer" title={LABELS[l.platform]}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted-foreground active:scale-95 transition-transform hover:text-amber-400 hover:border-amber-400/40">
              <Icon className="h-4 w-4" />
            </a>
          )
        })}
      </div>
    </div>
  )
}
