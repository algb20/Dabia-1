import Link from "next/link";
import { SITE, href } from "@/lib/discover/config";

export function Footer() {
  return (
    <footer className="d-foot">
      <div className="d-wrap">
        <div className="d-foot-grid">
          <div className="d-foot-col" style={{ maxWidth: 300 }}>
            <div className="d-brand" style={{ marginBottom: 12 }}>
              <span className="d-brand-mark">D</span>
              <span className="d-brand-name">{SITE.wordmark}</span>
            </div>
            <p className="d-faint" style={{ fontSize: 14, lineHeight: 1.6 }}>
              {SITE.descriptionShort}
            </p>
          </div>
          <div className="d-foot-col">
            <h4>Browse</h4>
            <Link href={href("/c/audio")}>Audio</Link>
            <Link href={href("/c/wearables")}>Wearables</Link>
            <Link href={href("/c/mobile")}>Mobile &amp; Tablets</Link>
            <Link href={href("/c/home")}>Home Tech</Link>
          </div>
          <div className="d-foot-col">
            <h4>Discover</h4>
            <Link href={href("/how-it-works")}>How it works</Link>
            <Link href={href("/saved")}>Saved &amp; alerts</Link>
            <Link href={href("/search")}>Search</Link>
          </div>
          <div className="d-foot-col">
            <h4>Trust</h4>
            <Link href={href("/disclosure")}>Affiliate disclosure</Link>
            <Link href={href("/privacy")}>Privacy</Link>
            <Link href={href("/terms")}>Terms</Link>
          </div>
        </div>
        <div className="d-foot-bottom">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Independent index — we link to official sources and may earn a commission.
          </p>
          {SITE.appBridgeUrl ? (
            <a className="d-btn d-btn--sm" href={SITE.appBridgeUrl}>
              Open the Dabia app
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
