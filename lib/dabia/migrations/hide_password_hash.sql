-- ============================================================================
-- Security hardening: password hashes out of the world-readable `users` table.
--
-- STATUS: STAGE 1 IS APPLIED & LIVE on the project (verified end-to-end).
-- The only step left is the final DROP at the bottom, which must run AFTER this
-- branch is deployed (the old deployed code still reads users.password; dropping
-- before deploy would break live login).
--
-- APPROACH: the hash lives only in a locked `user_secrets` vault (RLS denies
-- anon/authenticated). All verification happens inside SECURITY DEFINER
-- functions callable with the anon key — so NO service-role key is required, and
-- the hash never reaches the browser. PBKDF2 is implemented in SQL and verified
-- byte-identical to the app's Web Crypto output.
-- ============================================================================

-- ---------- vault (APPLIED) ----------
create table if not exists user_secrets (
  user_id       bigint primary key references users(id) on delete cascade,
  password_hash text,
  updated_at    timestamptz not null default now()
);
insert into user_secrets (user_id, password_hash)
select id, password from users where password is not null
on conflict (user_id) do nothing;
alter table user_secrets enable row level security;   -- no policies => deny anon/authenticated
revoke all on user_secrets from anon, authenticated;

-- ---------- functions (APPLIED) ----------
-- _dabia_pbkdf2 / _dabia_verify / _dabia_hash  (PBKDF2-HMAC-SHA256, pgcrypto in
--   the `extensions` schema, schema-qualified) and the guarded entrypoints:
--   dabia_login(email,password) -> jsonb {ok,reason,user(no hash)}
--   dabia_set_initial_secret(user_id,password) -> bool  (first-time only)
--   dabia_change_password(user_id,current,new) -> bool
--   dabia_reset_password(new) -> bool            (authorized by auth.email())
-- See the applied migrations password_vault_auth_functions,
-- password_vault_qualify_pgcrypto and password_vault_reset_rpc for the bodies.

-- ---------- STAGE 2 (APPLIED 2026-07-26) ----------
-- ALTER TABLE users DROP COLUMN IF EXISTS password;   ← EXECUTED, column gone.
-- Rollback (if ever needed):
--   ALTER TABLE users ADD COLUMN password text;
--   UPDATE users u SET password = s.password_hash FROM user_secrets s WHERE s.user_id = u.id;
