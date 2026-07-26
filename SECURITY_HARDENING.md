# Security hardening — password hash vault

## The issue (fixed in code, one deploy-gated step left)
`users.password` was readable with the public **anon** key via `select('*')`
(login, people-search, profiles). Some accounts even stored **plaintext**
passwords. Password credentials must never be world-readable.

## What was done — the permanent fix
The hash now lives only in a locked **`user_secrets`** vault (RLS denies anon +
authenticated). All verification runs inside **SECURITY DEFINER** functions
callable with the anon key, so **no service-role key is needed** and the hash
never reaches the browser. PBKDF2 is implemented in SQL and was verified
**byte-identical** to the app's Web Crypto output.

**Applied & live on the database (tested end-to-end):**
- `user_secrets` vault + backfill + RLS deny.
- `dabia_login(email,password)` → returns the user with **no** hash.
- `dabia_set_initial_secret(user_id,password)` → first-time only (can't hijack an
  existing / Pi-only account).
- `dabia_change_password(user_id,current,new)` → verifies current, then updates.
- `dabia_reset_password(new)` → authorized by the OTP-verified `auth.email()`.

Live test results (throwaway account): register ✓, second-set blocked ✓, login
correct ✓, case-insensitive ✓, wrong password rejected ✓, returned user has no
`password` key ✓, change-password ✓ (wrong-current rejected ✓), old password
rejected after change ✓.

**Client wired** (`lib/dabia/db/index.ts`): `loginWithEmailPassword`,
`registerUser`, `changePassword`, `resetPasswordWithCode` all go through the
vault RPCs. Every user read excludes the hash. No code path touches the column.

## Stage 2 — DONE (2026-07-26)
`users.password` column **dropped in production**.
Verified: `user_secrets` vault has 3 rows intact; anon has zero password-related
columns to select from `users`. No rollback needed — the vault is the permanent store.

## Stage 3 — DONE (2026-07-26)
Fixed remaining Supabase advisor warnings:

- **`function_search_path_mutable`** — `_dabia_pbkdf2`, `_dabia_verify`, `_dabia_hash` now have
  `SET search_path = extensions, public`, preventing search-path hijacking on SECURITY DEFINER calls.
- **`rls_enabled_no_policy`** resolved for three tables:
  - `notifications` → users can SELECT / DELETE their own rows (via `users.auth_id = auth.uid()` subquery)
  - `content_reports` → users can INSERT their own reports
  - `withdrawal_requests` → users can SELECT / INSERT their own requests
- Still intentional deny-all (no policies added): `user_secrets`, `discover_conversions`, `public.Dabia` (test artifact).

## Deferred (do WITH live Pi Browser testing — not blind)
Locking the low-risk permissive tables (`product_likes`, `product_shares`,
`saved_products`, `saved_posts`, `mentions`, `stream_*`, `live_streams`,
`app_official_links`) to `auth.uid()` isn't safe yet: Pi-only and guest sessions
don't always carry a Supabase Auth session, so those locks would break
liking/saving for them. Follows the "Supabase Auth as sole identity" migration.

## Operational (your side)
- Rotate the previously-exposed Pi API key in the Pi Developer portal.
- Enable Supabase leaked-password protection (paid plan). MFA already enabled.
