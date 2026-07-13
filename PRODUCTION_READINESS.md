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

## ✅ Batch 12 — Pro/badges, recommendations, communities, Pi-Browser share
- **Real account badges (not UI-only):** new server-authoritative
  `users.account_type` (standard/premium/official), locked from client edits by
  the guard trigger. Subscribing to **Pro** grants `premium`, **Official Brand**
  grants `official` — set by the server subscriptions route only after a verified
  Pi payment, and auto-reverted to `standard` when the subscription expires.
  Products now carry the seller's badge (`attachSellerAccountTypes`) so the
  Official/Premium badge actually shows on cards & detail. Plan feature lists
  rewritten to only real, working perks (fabricated AI/API/SLA claims removed).
- **Priority listing perk is real:** premium/official sellers get a ranking
  boost in the smart-sort trend engine.
- **Recommendation engine:** `get_recommendations` SECURITY DEFINER RPC — a
  content + trend hybrid that learns from each user's likes/saves/reviews/orders
  (category & seller affinity), excludes already-seen items, and cold-starts to
  trending. Surfaced as a "For You" rail on Home.
- **Communities/Groups system:** `groups`, `group_members`, `group_posts` with
  public/private groups, owner/admin/member roles, join requests + approval,
  in-group feed, and moderation — all writes via SECURITY DEFINER RPCs
  (`create_group`, `join_group`, `leave_group`, `group_moderate`,
  `post_to_group`, `delete_group_post`); member_count kept in sync by trigger.
  Official accounts' groups carry the verified badge. New routes `/groups` and
  `/groups/[id]`; entry point on the Space tab.
- **Share links open in Pi Browser:** new `PiBrowserGate` interstitial for
  recipients who open a share link outside Pi Browser — on Android it forces the
  link into Pi Browser via an `intent://…package=pi.browser` URL; on iOS it
  copies the link with instructions. Added to the root (share entry) and the
  public profile route; `/p/[id]` now redirects to `/?p=` so the gate fires.

## ✅ Batch 13 — Pi one-tap signup, Pro gating, badge consistency, price alerts
- **Pi one-tap signup/login:** `loginOrRegisterWithPi` + `useUserAuth.loginWithPi`
  — inside Pi Browser, one tap authenticates via `Pi.authenticate` and
  creates/fetches an active **buyer** account (full privileges: buy, save,
  comment) with no email or password. A synthetic Pi-linked email keeps the
  Supabase session/RLS linkage intact; the local cache now accepts Pi identity.
  Prominent "Continue with Pi" button on the login and register screens.
- **Pro tab is business-only:** the "Pro" bottom-nav tab now shows only for
  business accounts (role ≠ buyer) — buyers/guests get a cleaner 5-tab bar, and
  a saved "business" tab falls back to Home for non-business users.
- **Badge consistency:** the real `account_type` badge now also renders on
  social posts (feed) and on the public profile header/space — official (blue)
  / premium (gold), consistent with product cards.
- **Price-drop alerts (innovation):** the notifications feed now surfaces a
  real unread alert when a product you **saved** goes on a deal / discount —
  built purely on real data (saved_products × active deals), no new table.
- Verified: the account_type badge is tamper-proof — an authenticated client
  editing its own row is rejected by the guard trigger ("account_type can only
  be granted by the system"); only the server route grants it after a verified
  Pi payment.

## ✅ Batch 14 — Pi SDK fix, follow graph, TikTok-style feed, cross-posting
- **Pi login/pay now actually work:** the Pi SDK (`sdk.minepi.com/pi-sdk.js`)
  was never loaded, so `window.Pi` was always undefined. Added it to the layout
  `<head>` + init — the one-tap Pi sign-in and Pi payments now function inside
  Pi Browser.
- **Follow system:** `follows` table + `follow_user`/`unfollow_user` RPCs +
  `isFollowing`/`getFollowCounts`/`getFollowingSet`. Follow buttons on feed post
  cards and follower/following counts + Follow button on public profiles.
- **TikTok-style Social:** two tabs — **For You** (algorithmic feed via
  `get_social_feed`: recency + comment engagement + pin + author badge + a boost
  for people you follow) and **Following** (posts from accounts you follow).
  Save (bookmark) and comments already present.
- **Everything in Space auto-posts to Social:** going live, new auctions, and
  new group deals now auto-create an official post in the Social feed
  (announcements already were posts) via `crossPostToSocial`.
- **Announcement management in Pro:** the Pro tab now lists your announcements
  with working **edit** and **delete** (previously you could only send them).

## 🔜 Next batch (planned)
- Buyer–seller direct chat (Supabase Realtime; `messages`/`threads` tables
  already exist as the foundation).
- Reels — vertical short-video product discovery.
- Dispute/refund center + real seller trust score.

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
