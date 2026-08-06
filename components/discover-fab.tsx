"use client"

// ═══════════════════════════════════════════════════════════════════════════
// DiscoverFab — جسر عائم من التطبيق إلى موقع Dabia Discover.
//
// التصميم: حلقتان تتمدّدان ببطء (تردّدات) خلف زر زجاجي هادئ. لا وميض ولا
// إبهار — نبضة كل 3.2 ثانية بشفافية منخفضة، وتتوقّف تماماً إذا فضّل المستخدم
// تقليل الحركة (prefers-reduced-motion). يظهر على صفحات التطبيق فقط، ويُخفى
// داخل الموقع نفسه ومسارات ملء الشاشة (الفيد/البث) حتى لا يعترض المحتوى.
// ═══════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from "react"
import { BadgeCheck } from "lucide-react"

export default function DiscoverFab({ hidden = false }: { hidden?: boolean }) {
  // يُركّب بعد الترطيب فقط — يمنع أي اختلاف بين الخادم والعميل
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted || hidden) return null

  return (
    <a
      href="/discover"
      aria-label="Dabia Discover — فهرس المنتجات الأصلية ومقارنة الأسعار"
      title="Discover — مقارنة الأسعار من المصادر الرسمية"
      className="dbf-root group fixed bottom-24 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full"
    >
      {/* حلقات التردّد — زخرفية بحتة */}
      <span aria-hidden className="dbf-ring dbf-ring-1" />
      <span aria-hidden className="dbf-ring dbf-ring-2" />

      {/* جسم الزر — شارة التوثيق تميّزه عن تبويب Discover داخل التطبيق */}
      <span className="dbf-core relative flex h-12 w-12 items-center justify-center rounded-full">
        <BadgeCheck className="h-[19px] w-[19px] text-[hsl(var(--primary))] transition-transform duration-300 group-hover:scale-110" />
      </span>

      <style jsx>{`
        .dbf-root {
          -webkit-tap-highlight-color: transparent;
        }
        /* الجسم: زجاجي داكن بحدّ رفيع — يتناسق مع الهيدر والبطاقات */
        .dbf-core {
          background: hsl(var(--card) / 0.92);
          border: 1px solid hsl(var(--primary) / 0.28);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow:
            0 4px 16px hsl(20 14% 2% / 0.45),
            inset 0 1px 0 hsl(var(--primary) / 0.1);
          transition: border-color 0.3s ease, transform 0.3s ease;
        }
        .dbf-root:hover .dbf-core {
          border-color: hsl(var(--primary) / 0.55);
          transform: scale(1.06);
        }
        .dbf-root:active .dbf-core {
          transform: scale(0.94);
        }

        /* حلقات التردّد: تتمدّد وتتلاشى — شفافية منخفضة، بلا وهج */
        .dbf-ring {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 1px solid hsl(var(--primary) / 0.5);
          opacity: 0;
          pointer-events: none;
          animation: dbf-pulse 3.2s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
        }
        /* الحلقة الثانية تتأخّر — يعطي إحساس الموجة المتتابعة */
        .dbf-ring-2 {
          animation-delay: 1.15s;
        }

        @keyframes dbf-pulse {
          0%   { transform: scale(1);    opacity: 0.42; }
          70%  { transform: scale(1.75); opacity: 0;    }
          100% { transform: scale(1.75); opacity: 0;    }
        }

        /* احترام تفضيل تقليل الحركة — تختفي النبضة تماماً */
        @media (prefers-reduced-motion: reduce) {
          .dbf-ring { animation: none; opacity: 0; }
          .dbf-core { transition: none; }
        }
      `}</style>
    </a>
  )
}
