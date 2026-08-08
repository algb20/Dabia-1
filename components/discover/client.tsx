"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { SITE, href } from "@/lib/discover/config";
import { CATEGORIES } from "@/lib/discover/data";

/* ---------------- search ---------------- */
export function SearchBox({ size = "sm", autoFocus = false }: { size?: "sm" | "lg"; autoFocus?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);
  return (
    <form
      className="d-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(href(`/search?q=${encodeURIComponent(q.trim())}`));
      }}
      style={size === "lg" ? undefined : undefined}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={size === "lg" ? "Search a product, brand or category…" : "Search products…"}
        aria-label="Search products"
        autoFocus={autoFocus}
        enterKeyHint="search"
      />
    </form>
  );
}

/* ---------------- theme toggle ---------------- */
function applyTheme(t: "dark" | "light" | null) {
  const root = document.querySelector(".dsc") as HTMLElement | null;
  if (!root) return;
  if (t) root.setAttribute("data-dsc-theme", t);
  else root.removeAttribute("data-dsc-theme");
}
export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const saved = (localStorage.getItem("dsc-theme") as "dark" | "light" | null) || null;
    setTheme(saved);
  }, []);
  const toggle = useCallback(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const current = theme ?? (prefersDark ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("dsc-theme", next);
    applyTheme(next);
  }, [theme]);
  // Compute the display state only after mount so SSR and first client render agree.
  const isDark = mounted && (theme === "dark" || (theme === null && window.matchMedia("(prefers-color-scheme: dark)").matches));
  return (
    <button className="d-btn d-btn--icon d-btn--sm" onClick={toggle} aria-label="Toggle color theme" title="Toggle theme">
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

/* ---------------- header ---------------- */
export function Header() {
  const wordmark = SITE.wordmark;
  return (
    <header className="d-head">
      <div className="d-wrap d-head-inner">
        <Link href={href("/")} className="d-brand" aria-label={`${SITE.name} home`}>
          <span className="d-brand-mark">D</span>
          <span className="d-brand-name">
            {wordmark} <small>index</small>
          </span>
        </Link>
        {/* Categories are read from the catalog rather than hard-coded, so a new
            category appears in the nav the moment it is added to the data. The
            row scrolls horizontally instead of wrapping, which keeps the header
            one line tall no matter how many categories exist. */}
        <nav className="d-nav" aria-label="Primary">
          {CATEGORIES.map(c => (
            <Link key={c.id} href={href(`/c/${c.slug}`)}>
              {c.name}
            </Link>
          ))}
          <Link href={href("/how-it-works")} className="d-nav-sep">How it works</Link>
        </nav>
        <div className="d-head-search">
          <SearchBox />
        </div>
        <div className="d-actions">
          <Link href={href("/saved")} className="d-btn d-btn--icon d-btn--sm" aria-label="Saved & alerts" title="Saved & alerts">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 4h12v16l-6-4-6 4V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/* ---------------- localStorage-backed actions ---------------- */
function useLocalSet(key: string) {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setSet(new Set(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, [key]);
  const has = useCallback((id: string) => set.has(id), [set]);
  const toggle = useCallback(
    (id: string) => {
      setSet((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        try {
          localStorage.setItem(key, JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [key],
  );
  return { has, toggle, set };
}

export function SaveButton({ slug, full = false }: { slug: string; full?: boolean }) {
  const { has, toggle } = useLocalSet("dsc-saved");
  const saved = has(slug);
  return (
    <button className={`d-btn ${full ? "" : "d-btn--sm"} ${saved ? "d-btn--primary" : ""}`} onClick={() => toggle(slug)} aria-pressed={saved}>
      <svg viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} aria-hidden="true">
        <path d="M6 4h12v16l-6-4-6 4V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      {saved ? "Saved" : "Save"}
    </button>
  );
}

export function AlertButton({ slug }: { slug: string }) {
  const { has, toggle } = useLocalSet("dsc-alerts");
  const on = has(slug);
  return (
    <button className={`d-btn ${on ? "d-btn--primary" : ""}`} onClick={() => toggle(slug)} aria-pressed={on}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M10.5 20a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {on ? "Price alert on" : "Alert me on price drop"}
    </button>
  );
}

export function FollowBrand({ slug }: { slug: string }) {
  const { has, toggle } = useLocalSet("dsc-brands");
  const on = has(slug);
  return (
    <button className={`d-btn ${on ? "d-btn--primary" : ""}`} onClick={() => toggle(slug)} aria-pressed={on}>
      {on ? "Following" : "Follow brand"}
    </button>
  );
}

/* ---------------- search-page filters ---------------- */
export function Filters({
  categories,
  brands,
}: {
  categories: { slug: string; name: string }[];
  brands: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const cat = params.get("category") ?? "";
  const brand = params.get("brand") ?? "";
  const sort = params.get("sort") ?? "relevance";

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="d-stack" style={{ gap: 14 }}>
      <div className="d-filters" role="group" aria-label="Category">
        <button className={`d-fchip ${!cat ? "is-on" : ""}`} onClick={() => setParam("category", "")}>
          All categories
        </button>
        {categories.map((c) => (
          <button key={c.slug} className={`d-fchip ${cat === c.slug ? "is-on" : ""}`} onClick={() => setParam("category", c.slug)}>
            {c.name}
          </button>
        ))}
      </div>
      <div className="d-filters" role="group" aria-label="Brand">
        <button className={`d-fchip ${!brand ? "is-on" : ""}`} onClick={() => setParam("brand", "")}>
          All brands
        </button>
        {brands.map((b) => (
          <button key={b.slug} className={`d-fchip ${brand === b.slug ? "is-on" : ""}`} onClick={() => setParam("brand", b.slug)}>
            {b.name}
          </button>
        ))}
      </div>
      <div className="d-row" style={{ gap: 8 }}>
        <span className="d-kicker">Sort</span>
        {[
          ["relevance", "Relevance"],
          ["price_asc", "Price ↑"],
          ["price_desc", "Price ↓"],
          ["name", "Name"],
        ].map(([v, label]) => (
          <button key={v} className={`d-fchip ${sort === v ? "is-on" : ""}`} onClick={() => setParam("sort", v)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
