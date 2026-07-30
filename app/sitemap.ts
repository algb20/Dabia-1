import type { MetadataRoute } from "next"
import { PRODUCTS, BRANDS, CATEGORIES } from "@/lib/discover/data"

// عنوان الموقع القابل للفهرسة (الويب). يُضبط عبر NEXT_PUBLIC_SITE_URL عند
// النشر؛ الافتراضي هو نشر Vercel الحالي. (دومين Pi Browser لا يُفهرس.)
const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://dabia-1.vercel.app"

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticPaths = [
    "/",
    "/discover",
    "/discover/how-it-works",
    "/discover/search",
    "/discover/saved",
    "/discover/disclosure",
    "/discover/privacy",
    "/discover/terms",
  ]

  const productPaths  = PRODUCTS.map(p => `/discover/p/${p.slug}`)
  const brandPaths    = BRANDS.map(b => `/discover/b/${b.slug}`)
  const categoryPaths = CATEGORIES.map(c => `/discover/c/${c.slug}`)

  const all = [...staticPaths, ...productPaths, ...brandPaths, ...categoryPaths]

  return all.map(path => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/discover" ? 1 : path === "/" ? 0.9 : 0.7,
  }))
}
