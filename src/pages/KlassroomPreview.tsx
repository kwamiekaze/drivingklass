import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { KLASS_VIEWS, type KlassViewId, type RigInput } from "@/components/klassroom/views";
import "@/components/klassroom/klassroom.css";

const KlassroomCanvas = lazy(() => import("@/components/klassroom/KlassroomCanvas"));

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,500;1,600;1,700&family=Poppins:wght@400;500;600;700;800&display=swap";

function Stars() {
  return (
    <div className="kr-stars" aria-label="5 stars">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient id={`kr-g${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f7e3a1" />
              <stop offset="0.55" stopColor="#c9a24a" />
              <stop offset="1" stopColor="#f0d58a" />
            </linearGradient>
          </defs>
          <path
            fill={`url(#kr-g${i})`}
            d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"
          />
        </svg>
      ))}
    </div>
  );
}

/**
 * Temporary, unlisted preview of the DrivingKlass Klassroom. Lives at
 * /nuhome and is marked noindex until it replaces the live homepage.
 */
export default function KlassroomPreview() {
  const [activeId, setActiveId] = useState<KlassViewId>("welcome");
  const [ready, setReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const input = useRef<RigInput>({ dragX: 0, dragY: 0 });
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);

  const view = useMemo(() => KLASS_VIEWS.find((v) => v.id === activeId) ?? KLASS_VIEWS[0]!, [activeId]);

  // Head: title, noindex, fonts.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "The Klassroom | Driving Klass | Where 5-Star Drivers Are Made";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    let link = document.querySelector<HTMLLinkElement>(`link[data-klassroom-fonts]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_HREF;
      link.dataset.klassroomFonts = "true";
      document.head.appendChild(link);
    }
    return () => {
      document.title = prevTitle;
      robots.remove();
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setSplashDone(true), 900);
    return () => clearTimeout(t);
  }, [ready]);

  // Keyboard: arrows step through the room.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = KLASS_VIEWS.findIndex((v) => v.id === activeId);
      if (e.key === "ArrowRight") setActiveId(KLASS_VIEWS[(i + 1) % KLASS_VIEWS.length]!.id);
      if (e.key === "ArrowLeft") setActiveId(KLASS_VIEWS[(i - 1 + KLASS_VIEWS.length) % KLASS_VIEWS.length]!.id);
      if (e.key === "Escape") setActiveId("welcome");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = (e.clientX - d.x) / window.innerWidth;
    const dy = (e.clientY - d.y) / window.innerHeight;
    d.x = e.clientX;
    d.y = e.clientY;
    input.current.dragX = Math.max(-0.7, Math.min(0.7, input.current.dragX - dx * 2.2));
    input.current.dragY = Math.max(-0.6, Math.min(0.6, input.current.dragY + dy * 1.6));
  }, []);
  const endDrag = useCallback(() => {
    drag.current = null;
  }, []);

  const isHero = activeId === "welcome";

  return (
    <div
      className="kr-root"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={endDrag}
    >
      <div className="kr-canvas" aria-hidden="true">
        <Suspense fallback={null}>
          <KlassroomCanvas
            view={view}
            input={input}
            reducedMotion={reducedMotion}
            onReady={() => setReady(true)}
          />
        </Suspense>
      </div>

      <header className="kr-top">
        <Link to="/" className="kr-brand" aria-label="Driving Klass home">
          <b>DRIVING KLASS</b>
          <span>THE KLASSROOM</span>
        </Link>
        <div className="kr-top-actions">
          <span className="kr-preview-badge">Preview</span>
          <Link to="/" className="kr-btn">
            Book a Klass
          </Link>
        </div>
      </header>

      <section key={view.id} className={`kr-card${isHero ? " kr-card--hero" : ""}`} aria-live="polite">
        <div className="kr-eyebrow">{view.eyebrow}</div>
        <h1 className="kr-title">{view.title}</h1>
        <Stars />
        <p className="kr-body">{view.body}</p>
        <div className="kr-card-actions">
          <Link to="/" className="kr-btn">
            {view.id === "screen" ? "See all packages" : "Book a Klass"}
          </Link>
          {isHero ? (
            <button type="button" className="kr-btn kr-btn--ghost" onClick={() => setActiveId("board")}>
              Take the tour
            </button>
          ) : (
            <button
              type="button"
              className="kr-btn kr-btn--ghost kr-hide-sm"
              onClick={() => {
                const i = KLASS_VIEWS.findIndex((v) => v.id === activeId);
                setActiveId(KLASS_VIEWS[(i + 1) % KLASS_VIEWS.length]!.id);
              }}
            >
              Next stop
            </button>
          )}
        </div>
      </section>

      <div className="kr-hint">Drag to look around</div>

      <nav className="kr-dock" aria-label="Klassroom views">
        <div className="kr-dock-inner">
          {KLASS_VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className="kr-chip"
              aria-pressed={v.id === activeId}
              onClick={() => setActiveId(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="kr-splash" data-done={splashDone} aria-hidden={splashDone}>
        <div className="kr-splash-inner">
          <b>DRIVING KLASS</b>
          <em>Where 5-Star Drivers Are Made</em>
          <Stars />
        </div>
      </div>
    </div>
  );
}
