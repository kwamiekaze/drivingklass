import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { KLASS_VIEWS, createRigInput, type KlassViewId, type RigInput } from "@/components/klassroom/views";
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
  const [screenLive, setScreenLive] = useState(false);
  const [steered, setSteered] = useState(false);
  const input = useRef<RigInput>(createRigInput());
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const trail = useRef<Array<{ x: number; t: number }>>([]);
  const steeredRef = useRef(false);

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

  // The live homepage on the monitor wakes shortly after the room settles on
  // larger screens; on phones it waits until someone heads to the desk.
  useEffect(() => {
    if (!splashDone) return;
    if (activeId === "screen") {
      setScreenLive(true);
      return;
    }
    if (window.innerWidth < 768) return;
    const t = setTimeout(() => setScreenLive(true), 1500);
    return () => clearTimeout(t);
  }, [splashDone, activeId]);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setSplashDone(true), 900);
    return () => clearTimeout(t);
  }, [ready]);

  // Keyboard: arrows step through the room.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = KLASS_VIEWS.findIndex((v) => v.id === activeId);
      if (e.key === "ArrowRight") select(KLASS_VIEWS[(i + 1) % KLASS_VIEWS.length]!.id);
      if (e.key === "ArrowLeft") select(KLASS_VIEWS[(i - 1 + KLASS_VIEWS.length) % KLASS_VIEWS.length]!.id);
      if (e.key === "Escape") select("welcome");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId]);

  // Look around like IMVU with KleanupCrew's feel: one swipe turns most of the
  // room, a flick keeps gliding, vertical drag tilts, pinch or wheel zooms.
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const i = input.current;
    i.interacting = true;
    i.flick = 0;
    i.width = window.innerWidth;
    trail.current = [{ x: e.clientX, t: performance.now() }];
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = Math.hypot(a!.x - b!.x, a!.y - b!.y);
    }
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const endPointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);
    pinch.current = null;
    if (pointers.current.size === 0) {
      input.current.interacting = false;
      // Flick: average speed over the last ~90ms of the swipe keeps it turning.
      const now = performance.now();
      const recent = trail.current.filter((p) => now - p.t < 90);
      if (wasSingle && recent.length >= 2) {
        const first = recent[0]!;
        const last = recent[recent.length - 1]!;
        const dtMs = Math.max(16, last.t - first.t);
        input.current.flick = ((last.x - first.x) / dtMs) * 1000;
      }
    }
    trail.current = [];
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const i = input.current;
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (pinch.current) i.zoom *= Math.pow(pinch.current / Math.max(distance, 1), 1.6);
      pinch.current = distance;
      return;
    }
    if (!steeredRef.current) {
      steeredRef.current = true;
      setSteered(true);
    }
    i.dx += e.clientX - previous.x;
    i.dy += e.clientY - previous.y;
    const now = performance.now();
    trail.current.push({ x: e.clientX, t: now });
    if (trail.current.length > 12) trail.current.shift();
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const i = input.current;
    i.width = window.innerWidth;
    const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (horizontal !== 0) {
      i.dx -= horizontal * 1.4;
      return;
    }
    // Pinch on a trackpad arrives as ctrl+wheel with small deltas.
    const scale = e.ctrlKey ? 0.012 : 0.0016;
    i.zoom *= Math.exp(e.deltaY * scale);
  }, []);

  const select = useCallback((id: KlassViewId) => {
    setActiveId(id);
    steeredRef.current = false;
    setSteered(false);
  }, []);

  const isHero = activeId === "welcome";

  return (
    <div className="kr-root">
      <div
        className="kr-canvas"
        aria-hidden="true"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onWheel={onWheel}
      >
        <Suspense fallback={null}>
          <KlassroomCanvas
            view={view}
            input={input}
            reducedMotion={reducedMotion}
            started={splashDone}
            screenLive={screenLive}
            screenActive={activeId === "screen"}
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

      <section
        key={view.id}
        className={`kr-card${isHero ? " kr-card--hero" : ""}${view.id === "screen" ? " kr-card--mini" : ""}${steered ? " kr-card--steered" : ""}`}
        aria-live="polite"
      >
        <div className="kr-eyebrow">{view.eyebrow}</div>
        <h1 className="kr-title">{view.title}</h1>
        <Stars />
        <p className="kr-body">{view.body}</p>
        <div className="kr-card-actions">
          <Link to="/" className="kr-btn">
            {view.id === "screen" ? "See all packages" : "Book a Klass"}
          </Link>
          {isHero ? (
            <button type="button" className="kr-btn kr-btn--ghost" onClick={() => select("board")}>
              Take the tour
            </button>
          ) : (
            <button
              type="button"
              className="kr-btn kr-btn--ghost kr-hide-sm"
              onClick={() => {
                const i = KLASS_VIEWS.findIndex((v) => v.id === activeId);
                select(KLASS_VIEWS[(i + 1) % KLASS_VIEWS.length]!.id);
              }}
            >
              Next stop
            </button>
          )}
        </div>
      </section>

      <div className="kr-hint">Swipe to look around · pinch or scroll to zoom</div>

      <nav className="kr-dock" aria-label="Klassroom views">
        <div className="kr-dock-inner">
          {KLASS_VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className="kr-chip"
              aria-pressed={v.id === activeId}
              onClick={() => select(v.id)}
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
