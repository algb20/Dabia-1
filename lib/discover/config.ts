// Dabia Discover — single source of truth for brand identity.
// CHANGE THE NAME HERE (or via NEXT_PUBLIC_DISCOVER_NAME) — one place, whole site updates.
// This module is fully isolated: it imports nothing from the Dabia app and can be
// lifted out to its own deployment together with lib/discover, components/discover and app/discover.

export const SITE = {
  /** Public product name. Override with env NEXT_PUBLIC_DISCOVER_NAME to rebrand without touching code. */
  name: process.env.NEXT_PUBLIC_DISCOVER_NAME || "Dabia Discover",
  /** Short wordmark shown in the masthead. Falls back to the first word of `name`. */
  wordmark: process.env.NEXT_PUBLIC_DISCOVER_WORDMARK || "Discover",
  tagline: "The original, from its official source.",
  descriptionShort:
    "A neutral index of authentic products — compare verified official sources and go straight to the real one.",
  /** Primary public domain (informational; used for canonical/OG). Set at deploy time. */
  domain: process.env.NEXT_PUBLIC_DISCOVER_DOMAIN || "example.com",
  /** Optional deep link back to the Dabia app (the "bridge"). Empty hides the link. */
  appBridgeUrl: process.env.NEXT_PUBLIC_DABIA_APP_URL || "",
  /** Base path this module is mounted at inside the host Next app. */
  basePath: "/discover",
  supportEmail: process.env.NEXT_PUBLIC_DISCOVER_EMAIL || "hello@example.com",
} as const;

export function href(path = ""): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE.basePath}${p === "/" ? "" : p}`;
}
