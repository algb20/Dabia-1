-- ============================================================================
-- Security hardening: move the password hash out of the public-readable
-- `users` table into a locked-down `user_secrets` vault.
--
-- WHY: today the anon key can read `users.password` (a pbkdf2 hash) through any
-- select('*') (login, user search, profiles…). Hashes should never be world-
-- readable. This vault denies all anon/authenticated access; only the
-- service-role (server routes) can touch it.
--
-- APPLY IN TWO STAGES so production login is never at risk:
--
--   STAGE 1 (safe, additive — apply anytime):
--     runs the CREATE + BACKFILL + RLS below. Nothing breaks: the legacy
--     column still exists and the app keeps working unchanged.
--
--   STAGE 2 (the cutover — apply only AFTER the server login route is wired
--     and you have smoke-tested sign-in on the live site):
--     uncomment the DROP COLUMN at the bottom. This is what actually removes
--     the exposure. Rollback if ever needed:
--       ALTER TABLE users ADD COLUMN password text;
--       UPDATE users u SET password = s.password_hash
--         FROM user_secrets s WHERE s.user_id = u.id;
-- ============================================================================

-- ---------- STAGE 1 ----------
create table if not exists user_secrets (
  user_id       uuid primary key references users(id) on delete cascade,
  password_hash text,
  updated_at    timestamptz not null default now()
);

-- backfill existing hashes from the legacy column (idempotent)
insert into user_secrets (user_id, password_hash)
select id, password from users where password is not null
on conflict (user_id) do nothing;

-- lock it: RLS on, and NO policies => anon/authenticated get zero access.
-- Only the service-role key (used by the server auth routes) bypasses RLS.
alter table user_secrets enable row level security;
revoke all on user_secrets from anon, authenticated;

-- ---------- STAGE 2 (cutover — uncomment when ready) ----------
-- ALTER TABLE users DROP COLUMN IF EXISTS password;
