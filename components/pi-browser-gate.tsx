"use client"
// بوّابة "افتح في Pi Browser" — تظهر للمستلِم الذي فتح رابط مشاركة (منتج/حساب)
// خارج متصفّح Pi (مثلاً في كروم). تفتح الرابط فعلياً داخل Pi Browser على أندرويد
// عبر رابط intent، وتنسخه مع إرشاد على iOS. قابلة للتجاوز لتصفّح سريع.
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Hexagon } from "lucide-react"
import { isInsidePiBrowser, openInPiBrowser } from "@/lib/pi-browser"

export function PiBrowserGate({ always = false }: { always?: boolean }) {
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState<"" | "copied" | "manual">("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      if (isInsidePiBrowser()) return
      const params = new URLSearchParams(window.location.search)
      const isShareEntry = always || params.has("p") || params.has("u")
      const dismissed = sessionStorage.getItem("dabia_pi_gate_dismissed") === "1"
      if (isShareEntry && !dismissed) setShow(true)
    } catch {}
  }, [always])

  if (!show || !mounted) return null
  const url = typeof window !== "undefined" ? window.location.href : ""
  const dismiss = () => { try { sessionStorage.setItem("dabia_pi_gate_dismissed", "1") } catch {}; setShow(false) }
  const open = async () => {
    const r = await openInPiBrowser(url)
    if (r === "copied") setStatus("copied")
    else if (r === "manual") setStatus("manual")
    // على أندرويد يتولّى النظام التحويل إلى Pi Browser
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl border-t border-border bg-card p-5 pb-8 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/15">
            <Hexagon className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-black">Open in Pi Browser</p>
            <p className="text-[11px] text-muted-foreground">For Pi payments, identity & the full experience</p>
          </div>
        </div>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          You opened this Dabia link in a regular browser. Pi payments and verified sign-in only work inside <span className="font-semibold text-foreground">Pi Browser</span>. Open it there to buy, sell and pay with Pi.
        </p>
        <button onClick={open} className="w-full rounded-2xl bg-amber-400 py-3 text-sm font-black text-black active:scale-[0.98] transition-transform">
          Open in Pi Browser
        </button>
        {status === "copied" && (
          <p className="text-[11px] text-emerald-400 text-center">✓ Link copied — open Pi Browser and paste it in the address bar</p>
        )}
        {status === "manual" && (
          <p className="text-[11px] text-amber-400 text-center break-all">Copy this link and open it in Pi Browser: {url}</p>
        )}
        <button onClick={dismiss} className="w-full text-[12px] font-semibold text-muted-foreground py-1">
          Continue in this browser
        </button>
      </div>
    </div>,
    document.body
  )
}
