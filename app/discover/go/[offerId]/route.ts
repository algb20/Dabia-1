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
// Amazon Associates tag (amazon.com store). Add eBay/AliExpress IDs here as
// their programs are approved.
const AMAZON_TAG = process.env.DISCOVER_AMAZON_TAG || "dabia08-20";

function wrapAffiliate(rawUrl: string, sourceId: string): string {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    // Only wrap sources whose affiliate program is actually set up. Amazon is
    // live; other official sources stay clean direct links until their program
    // is approved (avoids fake/broken affiliate params on brand stores).
    if (sourceId === "amazon" && host.includes("amazon.") && AMAZON_TAG) {
      url.searchParams.set("tag", AMAZON_TAG);
      return url.toString();
    }
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
