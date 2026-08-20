// Per-product share card. A shared product link shows the real name, the best
// price and how many official sources back it — the comparison itself becomes
// the preview, which is what makes the link worth clicking.
import { ImageResponse } from "next/og"
import { getProductView } from "@/lib/discover/store"

export const alt = "Product price comparison on Dabia Discover"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image({ params }: { params: { slug: string } }) {
  const p = await getProductView(params.slug)

  const name = p?.name ?? "Dabia Discover"
  const brand = p?.brand?.name ?? ""
  const best = p?.bestOffer
  const sources = p?.offers.length ?? 0
  const price = best ? `${best.currency === "USD" ? "$" : `${best.currency} `}${best.price}` : ""

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
          padding: "64px 76px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#2fc4a3",
              color: "#0e1413",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            D
          </div>
          <span style={{ color: "#9ba69f", fontSize: 24 }}>Dabia Discover</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {brand && (
            <span style={{ color: "#d3ad57", fontSize: 24, letterSpacing: 3, fontWeight: 600 }}>
              {brand.toUpperCase()}
            </span>
          )}
          <div
            style={{
              color: "#ecefea",
              fontSize: name.length > 42 ? 54 : 66,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -1.5,
            }}
          >
            {name}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          {price && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ color: "#9ba69f", fontSize: 21 }}>Best price</span>
              <span style={{ color: "#2fc4a3", fontSize: 56, fontWeight: 800 }}>{price}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              padding: "12px 22px",
              borderRadius: 999,
              border: "1px solid #2fc4a344",
              color: "#2fc4a3",
              fontSize: 22,
              fontWeight: 600,
            }}
          >
            {sources} official {sources === 1 ? "source" : "sources"} compared
          </div>
        </div>
      </div>
    ),
    size,
  )
}
