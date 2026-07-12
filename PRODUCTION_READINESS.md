# Dabia — Production Readiness Log

This file records the production-hardening work and the honest remaining
items, so future sessions have full context.

## ✅ Done — Features & fixes
- Full Next.js app imported to the repo; hardcoded Pi secret removed.
- All TypeScript errors fixed; type-checking enforced in the build.
- ~900 lines of dead/mock scaffolding removed; all fake data purged (the
  in-memory store, 12 unused API routes, demo Discover sections).
- Root-cause fixes: missing `users` columns (avatar/bio/website/social),
  missing `orders` columns, storage upsert SELECT policy — profile save,
  order recording and avatar upload now work.
- Global auto-translation engine (one MutationObserver-based engine,
  Google Translate, per-language cache).
- Real star ratings (verified-purchase), share-to-social, live trend engine,
  in-browser image search + voice search.
- Social posting/comments/likes fixed; auto-post of high-demand products.
- Merchant limited-time offers + Home "Deals" strip with live countdown.
- In-app back navigation (overlays no longer exit the app); similar products;
  automatic country detection.
- Portal-rendered share sheet; product cards decluttered (actions moved into
  product detail).
- Professional checkout (quantity + shipping) + end-to-end order tracking
  (unique order number, 5-step timeline, carrier/tracking, confirm receipt).
- Live streaming commerce for merchants (WebRTC + Supabase Realtime: live
  comments, showcased products, live offers, reserve/order, scheduling).

## ✅ Phase 1 — Security (applied to the database)
- Wallet balance: system-only via atomic `apply_wallet_tx` RPC + guard
  trigger — no client tampering.
- Role/status: system-only; `auto_verify_self` enforces verification rules
  server-side; `admin_set_user_status` requires admin; guard blocks client
  changes; registration insert can't self-grant role/balance.
- `users` table: dropped "Allow all access"; strict owner-only update/delete.
- Passwords: upgraded to PBKDF2-SHA256 (100k) with transparent rehash.
- Supabase Auth reliability: auto-confirm trigger + email-matched
  `link_auth_id` so sessions establish for everyone.
- Subscriptions: server-only writes (free-premium hole closed).
- Legacy `Dabia` table (plaintext passwords) locked from client access.

## ✅ Phase 2 — Legal & escrow
- Terms (with marketplace/intermediary disclaimer), Privacy, and new
  Refund & Shipping policy; consent shown at registration + links in settings.
- Escrow state on orders (held → released on buyer confirmation → refunded),
  surfaced to buyer and seller.

## ✅ Phase 3 — Performance (database)
- Added covering indexes for all unindexed foreign keys + hot filter columns.
- Optimized high-traffic RLS policies (auth.uid() wrapped in a subselect).

## ✅ RLS lockdown (extended)
- `products` (owner-only write; stock decrement via order trigger),
  `orders` (buyer+seller only), `posts` & `product_comments` &
  `product_reviews` (author-only edit/delete). Poll voting moved to an
  atomic `vote_poll` RPC.

## ⚠️ Remaining — do WITH live Pi Browser testing (not blind)
1. Low-risk permissive tables still open (per-user toggles / ephemeral):
   product_likes, product_shares, saved_products, saved_posts, mentions,
   stream_* , live_streams, app_official_links. Optional owner-locks.
2. Fully hide password hashes from public read (move to a server-only path
   / drop the custom column once Supabase Auth is the sole authority).
3. Pi App-to-User (A2U) payout to release escrowed funds to sellers —
   requires Pi A2U credentials + testing.
4. Enable Supabase Auth leaked-password protection (needs paid plan) — MFA
   already enabled.
5. Rotate the previously-exposed Pi API key in the Pi Developer portal.

## Env vars required (Netlify / host)
- `PI_API_KEY` (Pi Platform secret) — rotate the old one.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only writes (subscriptions,
  business activation).
- Optional: `SERPER_API_KEY` (business verification), `STRIPE_SECRET_KEY`.
