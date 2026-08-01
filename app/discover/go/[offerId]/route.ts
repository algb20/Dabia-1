import { NextResponse } from "next/server";
import { getOfferView } from "@/lib/discover/store";
import { SITE } from "@/lib/discover/config";

// Tracked exit redirect. Records the click, wraps the destination with the
// affiliate reference, then forwards the user to the official source.
//
// CONNECTION SEAM: to go live, (1) persist the click to `discover_clicks`
// (Supabase) and (2) replace `wrapAffiliate` with each network's real deep-link
// builder (Amazon tag, Awin/CJ redirect, Skimlinks, etc.). Nothing else changes.

// Per-network affiliate identifiers. These are PUBLIC (they appear in every
// outbound link), so a default is safe; override per environment if needed.
const AMAZON_TAG = process.env.DISCOVER_AMAZON_TAG || "dabia08-20";
// AliExpress via Admitad deeplink id (from the account's default deeplink
// https://rzekl.com/g/<id>/). Products are wrapped with the standard `ulp`
// parameter carrying the url-encoded destination.
const ALI_ADMITAD_ID = process.env.DISCOVER_ADMITAD_ALI_ID || "1e8d11449436227c19ef16525dc3e8";

function wrapAffiliate(rawUrl: string, sourceId: string): string {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();

    // Amazon Associates — append the tag to any amazon.* destination.
    if (sourceId === "amazon" && host.includes("amazon.") && AMAZON_TAG) {
      url.searchParams.set("tag", AMAZON_TAG);
      return url.toString();
    }

    // AliExpress via Admitad — build a deeplink to the clean product URL.
    // Tracking params are stripped so the deeplink resolves reliably.
    if (sourceId === "aliexpress" && host.includes("aliexpress.") && ALI_ADMITAD_ID) {
      const clean = `${url.origin}${url.pathname}`;
      return `https://rzekl.com/g/${ALI_ADMITAD_ID}/?ulp=${encodeURIComponent(clean)}`;
    }

    // Other official sources stay clean direct links until their program is
    // approved (avoids fake/broken affiliate params on brand stores).
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

async function recordClick(offerId: string, sourceId: string): Promise<void> {
  // Placeholder: in production insert { offerId, sourceId, ts, ... } into discover_clicks.
  // Left as a no-op so the module runs with no backend connected.
  void offerId;
  void sourceId;
}

export async function GET(_req: Request, ctx: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await ctx.params;
  const offer = await getOfferView(offerId);

  if (!offer) {
    return NextResponse.redirect(new URL(SITE.basePath, _req.url), { status: 302 });
  }

  await recordClick(offer.id, offer.sourceId);
  const dest = wrapAffiliate(offer.url, offer.sourceId);
  return NextResponse.redirect(dest, { status: 302 });
}
