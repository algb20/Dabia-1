import type React from "react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/discover/client";
import { Footer } from "@/components/discover/footer";
import { SITE } from "@/lib/discover/config";
import "./discover.css";

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.descriptionShort,
  applicationName: SITE.name,
  robots: { index: true, follow: true },
};

// No-flash theme: applies the saved preference to the .dsc root before paint.
const themeScript = `(function(){try{var t=localStorage.getItem('dsc-theme');if(t){document.currentScript.parentElement.setAttribute('data-dsc-theme',t);}}catch(e){}})();`;

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dsc">
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main className="d-main">{children}</main>
      <Footer />
    </div>
  );
}
