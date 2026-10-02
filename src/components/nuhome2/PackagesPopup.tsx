import { useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";
import type { Package } from "@/data/packages";
import { useAnalytics } from "@/hooks/useAnalytics";
import { BRAND } from "./content";

/**
 * Packages as a transparent glass popup. Titles, prices, descriptions and Square links come straight from
 * `@/data/packages`, the same source as the homepage price wheel, so the two can never drift apart.
 * The panel is see-through and lightly blurred so the 3D world stays visible behind it.
 */
export function PackagesPopup({ packages, onClose }: { packages: Package[]; onClose: () => void }) {
  const { trackClick } = useAnalytics();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";   // the page behind never scrolls while the popup is open
    return () => { document.body.style.overflow = prev; };
  }, []);

  function book(pkg: Package) {
    trackClick("book_click", { package_id: pkg.id, square_url: pkg.squareUrl });
    const w = window.open(pkg.squareUrl, "_blank", "noopener,noreferrer");
    if (!w || w.closed || typeof w.closed === "undefined") window.location.href = pkg.squareUrl;
  }

  return (
    <div className="n2-pop-layer" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="n2-pop" role="dialog" aria-modal="true" aria-labelledby="n2-pop-h">
        <header className="n2-pop-head">
          <div>
            <span className="n2-pop-eyebrow">★ ★ ★ ★ ★</span>
            <h2 id="n2-pop-h" className="n2-pop-title">Choose your package</h2>
          </div>
          <button ref={closeRef} type="button" className="n2-x" aria-label="Close packages" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </header>
        <ul className="n2-pop-grid">
          {packages.map((p) => {
            const name = p.label.replace("\n", " ");
            return (
              <li key={p.id} className="n2-pop-card">
                <div className="n2-pop-card-top">
                  <h3 className="n2-pop-name">{name}</h3>
                  <span className="n2-pop-price">{p.price}</span>
                </div>
                <p className="n2-pop-desc">{p.description}</p>
                <button type="button" className="n2-pop-book" onClick={() => book(p)} aria-label={`Book ${name} for ${p.price}`}>
                  Book now <ExternalLink size={14} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <a className="n2-pop-call" href="tel:+14044045820">Questions? Call {BRAND.phone}</a>
      </section>
    </div>
  );
}
