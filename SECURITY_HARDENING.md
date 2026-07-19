# Security hardening — password hash vault

## The issue
The `users` table has a `password` column (a salted **pbkdf2** hash). Because the
app talks to Supabase with the public **anon** key and the table is readable, a
`select('*')` on `users` (login, user search, profiles) returns that hash to the
browser. Salted pbkdf2 is not trivially reversible, but **password hashes should
never be world-readable** — they enable offline cracking.

## The permanent fix (prepared, ready to activate)
Move the hash into a locked **`user_secrets`** vault (RLS denies anon +
authenticated; only the service-role key reaches it), verify credentials in a
**server route**, and drop the public column. Nothing is left readable.

Files added (all inert until you flip the switch — **zero runtime change today**):

| File | Purpose |
|---|---|
| `lib/dabia/migrations/hide_password_hash.sql` | Creates + backfills + locks `user_secrets`; gated `DROP COLUMN` |
| `lib/dabia/password.ts` | Shared pbkdf2 verify/hash (verified identical to the app's) |
| `app/api/dabia/auth/login/route.ts` | Server credential check (service-role), returns a user **without** the hash |

The pbkdf2 round-trip was validated in the Node runtime, so existing hashes
verify correctly server-side.

## Cutover — the safe order (needs one live login test)
Do this together, and test on the live site between the steps that matter:

1. **Stage 1 (safe, additive):** run the top of `hide_password_hash.sql`
   (`user_secrets` create + backfill + RLS). Nothing changes for users.
2. **Wire login:** point the client's email/password login at
   `POST /api/dabia/auth/login` (then create the Supabase Auth session as today).
   Requires `SUPABASE_SERVICE_ROLE_KEY` set on the host.
3. **Smoke-test:** log in with a real account on the live site. Confirm it works.
4. **Stage 2 (cutover):** uncomment `ALTER TABLE users DROP COLUMN password;` and
   run it. The exposure is now closed. (Rollback SQL is in the migration file.)

> This is gated on purpose: steps 2–4 touch **production sign-in**, which can't be
> end-to-end tested from the build sandbox (Supabase is network-blocked here).
> Flipping it blind risks locking users out — so it waits for a 30-second live test.

## Deferred (do WITH live Pi Browser testing — not blind)
Locking the low-risk permissive tables (`product_likes`, `product_shares`,
`saved_products`, `saved_posts`, `mentions`, `stream_*`, `live_streams`,
`app_official_links`) to `auth.uid()` is **not safe to apply yet**: Pi-only and
guest sessions don't always carry a Supabase Auth session, so `auth.uid()` locks
would break liking/saving for those users. This should follow the "Supabase Auth
as the sole identity" migration and be verified inside Pi Browser. Documented so
it isn't forgotten.

## Also on your side (operational)
- Rotate the previously-exposed Pi API key in the Pi Developer portal.
- Enable Supabase leaked-password protection (paid plan). MFA already enabled.
