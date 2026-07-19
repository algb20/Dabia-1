import { NextResponse } from "next/server";
import { getOfferView } from "@/lib/discover/store";
import { SITE } from "@/lib/discover/config";

// Tracked exit redirect. Records the click, wraps the destination with the
// affiliate reference, then forwards the user to the official source.
//
// CONNECTION SEAM: to go live, (1) persist the click to `discover_clicks`
// (Supabase) and (2) replace `wrapAffiliate` with each network's real deep-link
// builder (Amazon tag, Awin/CJ redirect, Skimlinks, etc.). Nothing else changes.

const AFFILIATE_TAG = process.env.DISCOVER_AFFILIATE_TAG || ""; // e.g. "dabia-20"

function wrapAffiliate(rawUrl: string, sourceId: string): string {
  if (!AFFILIATE_TAG) return rawUrl;
  try {
    const url = new URL(rawUrl);
    // Generic placeholder wiring; real networks each have their own scheme.
    if (sourceId === "amazon") url.searchParams.set("tag", AFFILIATE_TAG);
    else url.searchParams.set("ref", AFFILIATE_TAG);
    return url.toString();
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
  const offer = getOfferView(offerId);

  if (!offer) {
    return NextResponse.redirect(new URL(SITE.basePath, _req.url), { status: 302 });
  }

  await recordClick(offer.id, offer.sourceId);
  const dest = wrapAffiliate(offer.url, offer.sourceId);
  return NextResponse.redirect(dest, { status: 302 });
}
