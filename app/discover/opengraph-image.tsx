// Social share card for the Discover site. Without one, every link shared to
// WhatsApp, X or Facebook renders as a bare grey box — the single cheapest
// marketing loss on a site meant to be shared. Generated at the edge, so there
// is no image asset to keep in sync with the brand.
import { ImageResponse } from "next/og"
// Counts come straight from the catalog module. Importing STATS instead would
// pull all of store.ts — including its Supabase client — into image generation,
// which crashes the render.
import { PRODUCTS, SOURCES, BRANDS, OFFERS } from "@/lib/discover/data"

// Runs on the Node runtime, like the per-product card: STATS reads the catalog
// module, which the edge runtime cannot resolve.
export const alt = "Dabia Discover — the original, from its official source"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0e1413",
          padding: "72px 80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#2fc4a3",
              color: "#0e1413",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            D
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ color: "#ecefea", fontSize: 30, fontWeight: 700 }}>Discover</span>
            <span style={{ color: "#6c766f", fontSize: 22 }}>index</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid #d3ad5755",
              color: "#d3ad57",
              fontSize: 19,
              letterSpacing: 2,
              fontWeight: 600,
            }}
          >
            OFFICIAL-SOURCE INDEX
          </div>
          {/* Satori requires an explicit display on any element with more than
              one child, so the two lines are flex items rather than a <br>. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              color: "#ecefea",
              fontSize: 74,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -2,
            }}
          >
            <span>The original.</span>
            <span>From its official source.</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 56 }}>
          {[
            [String(PRODUCTS.length), "Products indexed"],
            [String(SOURCES.length), "Official sources"],
            [String(BRANDS.length), "Verified brands"],
            [String(OFFERS.length), "Live-ready listings"],
          ].map(([n, label]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ color: "#2fc4a3", fontSize: 38, fontWeight: 700 }}>{n}</span>
              <span style={{ color: "#9ba69f", fontSize: 20 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  )
}
