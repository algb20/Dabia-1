-- ============================================================================
-- Dabia Discover — database schema (Supabase / Postgres).
--
-- STATUS: READY, NOT APPLIED. This file is the data "connection seam". Apply it
-- when you connect real data. Until then the site runs from lib/discover/data.ts.
--
-- To apply: run this in the Supabase SQL editor (or as a migration). Then swap
-- the reads in lib/discover/store.ts from the seed to these tables. Nothing in
-- the UI changes.
--
-- Design notes:
--   * Catalog tables (sources/brands/categories/products/offers) are PUBLIC READ
--     — they are a public index and should be crawlable/SSR-able with the anon key.
--   * Writes to the catalog are service-role only (feed ingestion runs server-side).
--   * discover_clicks accepts anonymous inserts (the exit-redirect logs a click);
--     reads are service-role only (analytics).
--   * discover_conversions is fully server-only (written from network postbacks).
--   * discover_saved / discover_alerts are per-user and scoped to auth.uid()
--     (wire once Pi SSO / Supabase Auth identity is connected).
-- ============================================================================

-- ---- enums ----
do $$ begin
  create type discover_source_kind as enum ('brand', 'authorized', 'marketplace', 'network');
exception when duplicate_object then null; end $$;

do $$ begin
  create type discover_availability as enum ('in_stock', 'low', 'preorder', 'out');
exception when duplicate_object then null; end $$;

-- ---- sources (a brand store, authorized retailer, marketplace or affiliate network) ----
create table if not exists discover_sources (
  id          text primary key,
  name        text not null,
  kind        discover_source_kind not null default 'brand',
  official    boolean not null default true,
  domain      text not null,
  code        text not null,                       -- short ledger code, e.g. 'APL'
  created_at  timestamptz not null default now()
);

-- ---- categories ----
create table if not exists discover_categories (
  id     text primary key,
  slug   text not null unique,
  name   text not null,
  blurb  text not null default ''
);

-- ---- brands ----
create table if not exists discover_brands (
  id           text primary key,
  slug         text not null unique,
  name         text not null,
  official     boolean not null default true,
  blurb        text not null default '',
  monogram     text not null default '',
  hue          int  not null default 220,
  created_at   timestamptz not null default now()
);

-- ---- products (a unified item; the same product may have many offers) ----
create table if not exists discover_products (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  brand_id     text not null references discover_brands(id) on delete restrict,
  category_id  text not null references discover_categories(id) on delete restrict,
  summary      text not null default '',
  description  text not null default '',
  specs        jsonb not null default '[]'::jsonb,   -- [{label,value}]
  history      jsonb not null default '[]'::jsonb,   -- [{date,price}] base-currency
  currency     text not null default 'USD',
  gtin         text,
  hue          int  not null default 220,
  match_key    text,                                 -- normalized name/gtin for dedup
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_discover_products_brand on discover_products(brand_id);
create index if not exists idx_discover_products_category on discover_products(category_id);
create index if not exists idx_discover_products_match on discover_products(match_key);
-- full-text search over name + summary
create index if not exists idx_discover_products_fts
  on discover_products using gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(summary,'')));

-- ---- offers (one product, priced at one source) ----
create table if not exists discover_offers (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references discover_products(id) on delete cascade,
  source_id     text not null references discover_sources(id) on delete restrict,
  price         numeric(12,2) not null,
  currency      text not null default 'USD',
  url           text not null,                       -- real destination; affiliate wrap at redirect
  availability  discover_availability not null default 'in_stock',
  ships_to      text,
  updated_at    timestamptz not null default now()
);
create index if not exists idx_discover_offers_product on discover_offers(product_id);
create index if not exists idx_discover_offers_source on discover_offers(source_id);

-- ---- clicks (exit-redirect tracking) ----
create table if not exists discover_clicks (
  id          bigint generated always as identity primary key,
  offer_id    uuid references discover_offers(id) on delete set null,
  source_id   text,
  user_id     uuid,                                  -- nullable (anonymous)
  ref         text,                                  -- affiliate sub-id / campaign
  ua          text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_discover_clicks_offer on discover_clicks(offer_id);
create index if not exists idx_discover_clicks_created on discover_clicks(created_at);

-- ---- conversions (from network postbacks; server-only) ----
create table if not exists discover_conversions (
  id           bigint generated always as identity primary key,
  click_id     bigint references discover_clicks(id) on delete set null,
  offer_id     uuid references discover_offers(id) on delete set null,
  amount       numeric(12,2),
  currency     text,
  commission   numeric(12,2),
  network      text,
  external_id  text unique,                          -- dedupe postbacks
  status       text not null default 'pending',
  created_at   timestamptz not null default now()
);

-- ---- saved / alerts (per user) ----
create table if not exists discover_saved (
  user_id     uuid not null,
  product_id  uuid not null references discover_products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists discover_alerts (
  user_id      uuid not null,
  product_id   uuid not null references discover_products(id) on delete cascade,
  target_price numeric(12,2),                         -- notify at/below (null = any drop)
  currency     text not null default 'USD',
  created_at   timestamptz not null default now(),
  primary key (user_id, product_id)
);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table discover_sources     enable row level security;
alter table discover_categories  enable row level security;
alter table discover_brands      enable row level security;
alter table discover_products    enable row level security;
alter table discover_offers      enable row level security;
alter table discover_clicks      enable row level security;
alter table discover_conversions enable row level security;
alter table discover_saved       enable row level security;
alter table discover_alerts      enable row level security;

-- public read on the catalog (anon + authenticated)
do $$
declare t text;
begin
  foreach t in array array['discover_sources','discover_categories','discover_brands','discover_products','discover_offers']
  loop
    execute format('drop policy if exists %I_read on %I;', t, t);
    execute format('create policy %I_read on %I for select using (true);', t, t);
  end loop;
end $$;

-- clicks: anyone may insert (the redirect logs), no one may read via API
drop policy if exists discover_clicks_insert on discover_clicks;
create policy discover_clicks_insert on discover_clicks for insert with check (true);

-- conversions: no anon/authenticated access at all (service-role only bypasses RLS)

-- saved / alerts: each user sees and manages only their own rows
do $$
declare t text;
begin
  foreach t in array array['discover_saved','discover_alerts']
  loop
    execute format('drop policy if exists %I_rw on %I;', t, t);
    execute format($f$create policy %I_rw on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id);$f$, t, t);
  end loop;
end $$;

-- ============================================================================
-- Notes for going live
--   1. Ingest feeds (Amazon PA-API, Awin/CJ/Skimlinks, brand feeds) into
--      discover_sources / discover_products / discover_offers with service-role.
--   2. Point lib/discover/store.ts at these tables (keep the function signatures).
--   3. Implement wrapAffiliate()/recordClick() in app/discover/go/[offerId] to
--      insert into discover_clicks and build the network deep-link.
--   4. Handle network postbacks server-side into discover_conversions.
-- ============================================================================
