# Dabia Discover — an isolated, ready-to-connect website

An independent **official-source product index**: users search authentic products,
compare every official / authorized source in one ledger, and are sent straight to
the genuine seller (affiliate model — we never hold stock or take payment).

It is built as a **fully self-contained module**. It imports **nothing** from the
Dabia app, ships its own design system, data and components, and runs today with no
backend. Only two things are intentionally left for you: **a domain** and **the
connection** of live data / identity.

---

## What is already done (everything except the connection)

- **Full site**, professional and theme-aware (light + dark):
  - Home / index, global search with category + brand + sort filters
  - Product page with the signature **offers ledger** (per-source price, currency,
    availability, verified seal, best-price flag, ≈USD cross-currency, price history)
  - Category pages, brand pages (with follow), saved & price-alerts, how-it-works,
    affiliate disclosure, privacy, terms
  - Tracked **exit redirect** (`/discover/go/[offerId]`) — the affiliate click loop
- **Real seed catalog** (14 products, 8 brands, 10 sources, 33 listings) so the site
  is fully functional offline — no "coming soon", no mock UI.
- **SEO ready**: per-page metadata, static generation of product/category/brand pages.
- **Accessibility**: keyboard focus states, reduced-motion support, semantic markup.
- **Rebrandable name**: change it in one place (see below).

## What remains — only domain + connection

1. **Domain** — point your `.com` at the deployment and set `NEXT_PUBLIC_DISCOVER_DOMAIN`.
2. **Connection** (three clearly-marked seams — signatures don't change, UI doesn't change):
   - **Data** → replace the seed reads in `lib/discover/store.ts` with Supabase
     (`discover_*` tables) fed by affiliate feeds. The `store.ts` functions are the
     single seam.
   - **Affiliate links** → implement `wrapAffiliate()` + `recordClick()` in
     `app/discover/go/[offerId]/route.ts` with your real network deep-links
     (Amazon tag, Awin/CJ/Skimlinks…) and click persistence.
   - **Identity** → email now; wire **Pi SSO** when available for saved/alerts sync
     (today those live in `localStorage`).

## Change the name (rebrand in one place)

Edit `lib/discover/config.ts` → `SITE.name` / `SITE.wordmark`, **or** set env vars
without touching code:

```
NEXT_PUBLIC_DISCOVER_NAME="Your Name"
NEXT_PUBLIC_DISCOVER_WORDMARK="YourWord"
NEXT_PUBLIC_DISCOVER_DOMAIN="yourdomain.com"
NEXT_PUBLIC_DABIA_APP_URL="https://app.link"   # optional bridge back to Dabia; empty hides it
NEXT_PUBLIC_DISCOVER_EMAIL="hello@yourdomain.com"
DISCOVER_AFFILIATE_TAG="your-tag"              # server-only, used at redirect time
```

## Keep it, or split it out later

Today it lives at `/discover` inside this Next app (shared build & deploy — zero
extra cost). Because it is isolated, lifting it into its **own deployment / domain**
is a move, not a rewrite:

```
app/discover/**          → app/**            (drop the /discover base path)
lib/discover/**          → lib/**
components/discover/**    → components/**
```

Then set `SITE.basePath = ""` in `config.ts`. Nothing imports Dabia, so nothing breaks.

## Files

```
lib/discover/config.ts      brand + name (single source of truth)
lib/discover/types.ts       data model (mirrors discover_* schema)
lib/discover/data.ts        curated seed catalog
lib/discover/store.ts       query layer  ← THE data connection seam
lib/discover/format.ts      money / date / availability helpers
components/discover/ui.tsx        server components (cards, ledger, seal, sparkline)
components/discover/client.tsx    client components (search, filters, theme, save/alert/follow)
components/discover/footer.tsx    footer
app/discover/layout.tsx     isolated shell (own header/footer + theme)
app/discover/discover.css   scoped design system (.dsc namespace)
app/discover/**             pages + tracked redirect route
```
