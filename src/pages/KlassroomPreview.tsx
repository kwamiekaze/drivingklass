import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Phone, X } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { KLASS_VIEWS, createRigInput, wrapAngle, type KlassViewId, type RigInput } from "@/components/klassroom/views";
import "@/components/klassroom/klassroom.css";

const KlassroomCanvas = lazy(() => import("@/components/klassroom/KlassroomCanvas"));

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,500;1,600;1,700&family=Poppins:wght@400;500;600;700;800&display=swap";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

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
  const [steered, setSteered] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [lost, setLost] = useState(false);
  const contactOpenRef = useRef(false);
  contactOpenRef.current = contactOpen;
  const input = useRef<RigInput>(createRigInput());
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const steeredRef = useRef(false);
  const downAt = useRef(new Map<number, { x: number; y: number }>());

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
      if (e.key === "ArrowRight") select(KLASS_VIEWS[(i + 1) % KLASS_VIEWS.length]!.id);
      if (e.key === "ArrowLeft") select(KLASS_VIEWS[(i - 1 + KLASS_VIEWS.length) % KLASS_VIEWS.length]!.id);
      if (e.key === "Escape") {
        if (contactOpenRef.current) {
          setContactOpen(false);
          return;
        }
        select("welcome");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId]);

  // Same gestures as kleanupcrew.com: drag turns through a full 360 and stays
  // where it is left, vertical drag tilts, pinch or wheel zooms.
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a!.x - b!.x, a!.y - b!.y), zoom: input.current.zoom };
    }
    // Capture only once this turns into a drag, so taps still reach the desk screen.
    downAt.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }, []);

  const endPointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    downAt.current.delete(e.pointerId);
    pinch.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(e.pointerId);
    if (!previous) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const start = downAt.current.get(e.pointerId);
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) {
      downAt.current.delete(e.pointerId);
      if (!e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.setPointerCapture(e.pointerId);
    }
    const i = input.current;
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const start = pinch.current;
      if (!start) {
        pinch.current = { distance, zoom: i.zoom };
        return;
      }
      // Measured from the start of the gesture so even a short pinch zooms clearly.
      const scale = distance / Math.max(start.distance, 1);
      i.zoom = clamp(start.zoom - Math.log(scale) * 2.5, -1, 1);
      return;
    }
    if (!steeredRef.current) {
      steeredRef.current = true;
      setSteered(true);
    }
    const dx = e.clientX - previous.x;
    const dy = e.clientY - previous.y;
    const touch = e.pointerType === "touch";
    i.dragX = wrapAngle(i.dragX - dx * (touch ? 0.014 : 0.01));
    i.dragY = clamp(i.dragY + dy * (touch ? 0.009 : 0.006), -1, 1);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    const i = input.current;
    const horizontalDelta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
    if (horizontalDelta !== 0) {
      i.dragX = wrapAngle(i.dragX + horizontalDelta * 0.006);
      return;
    }
    i.zoom = clamp(i.zoom + e.deltaY / 700, -1, 1);
  }, []);

  const select = useCallback((id: KlassViewId) => {
    setActiveId(id);
    input.current.dragX = 0;
    input.current.dragY = 0;
    input.current.zoom = 0;
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
            onReady={() => setReady(true)}
            onLost={() => setLost(true)}
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
        className={`kr-card${isHero ? " kr-card--hero" : ""}${steered ? " kr-card--steered" : ""}`}
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

      <div className="kr-hint">Drag to look around · pinch or scroll to zoom</div>

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

      <div className="kr-fab">
        <button type="button" className="kr-fab-btn" aria-label="Send us a message" onClick={() => setContactOpen(true)}>
          <MessageCircle aria-hidden="true" />
        </button>
        <a className="kr-fab-btn" href="tel:+14044045820" aria-label="Call Driving Klass at 404-404-5820">
          <Phone aria-hidden="true" />
        </a>
      </div>

      {contactOpen && (
        <div
          className="kr-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Contact Driving Klass"
          onClick={(e) => {
            if (e.target === e.currentTarget) setContactOpen(false);
          }}
        >
          <div className="kr-modal-panel bg-background text-foreground">
            <button type="button" className="kr-modal-close" aria-label="Close" onClick={() => setContactOpen(false)}>
              <X aria-hidden="true" />
            </button>
            <h2 className="kr-modal-title">CONTACT DRIVING KLASS</h2>
            <ContactForm />
          </div>
        </div>
      )}

      {lost && (
        <div className="kr-lost" role="alert">
          <p>The Klassroom paused to save your battery.</p>
          <button type="button" className="kr-btn" onClick={() => window.location.reload()}>
            Reload the Klassroom
          </button>
        </div>
      )}

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
