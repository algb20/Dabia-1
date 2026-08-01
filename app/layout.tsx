import type React from "react";
import type { Metadata } from "next";
import { APP_CONFIG } from "@/lib/app-config";
import TranslationProvider from "@/components/translation-provider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const appName = APP_CONFIG.NAME;
const appDescription = APP_CONFIG.DESCRIPTION;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://dabia-1.vercel.app"),
  title: "Dabia — Smart Commerce on Pi Network",
  description: appDescription,
  alternates: { canonical: "/" },
  manifest: "/manifest.json",
  // تحقّق ملكية الموقع لشبكات الإحالة (Admitad وغيرها)
  other: {
    "verify-admitad": "36227c19ef",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: appName,
  },
  openGraph: {
    type: "website",
    title: appName,
    description: appDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: appName,
    description: appDescription,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* يطبَّق فوراً قبل أي رسم — يمنع الوميض ويضمن ثبات الوضع المحفوظ عند كل فتح للتطبيق */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var t = localStorage.getItem("dabia_theme") || "dark";
                  var dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
                  document.documentElement.classList.toggle("dark", dark);
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* Pi Network SDK — ضروري ليتوفّر window.Pi داخل Pi Browser. بدونه لا يعمل
            تسجيل الدخول بمعرّف Pi ولا مدفوعات Pi إطلاقاً. يُحمَّل مبكراً ثم يُهيّأ. */}
        <script src="https://sdk.minepi.com/pi-sdk.js" async />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                function initPi(){ try { if (window.Pi) { window.Pi.init({ version: "2.0", sandbox: false }); } } catch (e) {} }
                if (window.Pi) { initPi(); }
                else { window.addEventListener("load", function(){ setTimeout(initPi, 300); }); }
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans">
        <TranslationProvider>{children}</TranslationProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
