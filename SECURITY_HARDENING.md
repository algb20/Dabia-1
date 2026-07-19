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

## The one remaining step (deploy-gated, not test-gated)
Dropping the legacy `users.password` column is what finally removes the exposure.
It must run **after this branch is deployed to production**, because the
currently-deployed old code still reads that column — dropping it first would
break live login.

```sql
-- run once this branch is live in production:
ALTER TABLE users DROP COLUMN IF EXISTS password;
```
Rollback is in `lib/dabia/migrations/hide_password_hash.sql`. Ping me right after
you deploy and I'll run the drop (and confirm anon can no longer read anything
sensitive), or run the one line yourself.

## Deferred (do WITH live Pi Browser testing — not blind)
Locking the low-risk permissive tables (`product_likes`, `product_shares`,
`saved_products`, `saved_posts`, `mentions`, `stream_*`, `live_streams`,
`app_official_links`) to `auth.uid()` isn't safe yet: Pi-only and guest sessions
don't always carry a Supabase Auth session, so those locks would break
liking/saving for them. Follows the "Supabase Auth as sole identity" migration.

## Operational (your side)
- Rotate the previously-exposed Pi API key in the Pi Developer portal.
- Enable Supabase leaked-password protection (paid plan). MFA already enabled.
