"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProductView } from "@/lib/discover/store";
import type { ProductView } from "@/lib/discover/types";
import { ProductCard } from "@/components/discover/ui";
import { href } from "@/lib/discover/config";

function read(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export default function SavedPage() {
  const [saved, setSaved] = useState<ProductView[]>([]);
  const [alerts, setAlerts] = useState<ProductView[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const toViews = async (slugs: string[]) => {
      const views = await Promise.all(slugs.map((s) => getProductView(s)));
      return views.filter(Boolean) as ProductView[];
    };
    toViews(read("dsc-saved")).then(setSaved);
    toViews(read("dsc-alerts")).then(setAlerts);
    setReady(true);
  }, []);

  return (
    <section className="d-wrap d-section" style={{ paddingTop: 34 }}>
      <div className="d-stack" style={{ gap: 8, marginBottom: 26 }}>
        <span className="d-eyebrow">Your list</span>
        <h1 className="d-h1" style={{ fontSize: "clamp(28px,3.6vw,40px)" }}>
          Saved &amp; alerts
        </h1>
        <p className="d-lead">Kept on this device. Sign-in sync arrives with Pi identity.</p>
      </div>

      {!ready ? null : saved.length || alerts.length ? (
        <div className="d-stack" style={{ gap: 40 }}>
          {saved.length ? (
            <div>
              <h2 className="d-h3" style={{ marginBottom: 16 }}>
                Saved ({saved.length})
              </h2>
              <div className="d-grid">
                {saved.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            </div>
          ) : null}
          {alerts.length ? (
            <div>
              <h2 className="d-h3" style={{ marginBottom: 16 }}>
                Price alerts ({alerts.length})
              </h2>
              <div className="d-grid">
                {alerts.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="d-empty">
          <h2 className="d-h3">Nothing saved yet</h2>
          <p style={{ marginBottom: 18 }}>Save a product or set a price alert and it shows up here.</p>
          <Link href={href("/")} className="d-btn d-btn--primary">
            Browse the index
          </Link>
        </div>
      )}
    </section>
  );
}
