import type { MetadataRoute } from "next"

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://dabia-app.vercel.app"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // مسارات داخلية لا فائدة من فهرستها
        disallow: ["/api/", "/discover/go/"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  }
}
