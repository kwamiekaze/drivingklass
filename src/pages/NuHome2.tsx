import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Moon, Phone, Sun, X } from "lucide-react";
import { ContactForm } from "@/components/ContactForm";
import { useTheme } from "@/components/ThemeProvider";
import { getPackagesSortedByPosition, type Package } from "@/data/packages";
import { formatChipPrice } from "@/lib/priceFormatters";
import { BRAND, COPY } from "@/components/nuhome2/content";
import { VIEWS, type ViewId } from "@/components/nuhome2/world/views";
import "@/components/nuhome2/nuhome2.css";

// The 3D world loads on its own so the page shell, copy and packages paint first.
const Scene = lazy(() => import("@/components/nuhome2/world/Scene"));

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,600&family=Poppins:wght@400;500;600;700;800&display=swap";

function Stars({ className = "" }: { className?: string }) {
  return (
    <div className={`n2-stars ${className}`} aria-label="5 stars" role="img">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" aria-hidden="true" style={{ animationDelay: `${i * 0.28}s` }}>
          <defs>
            <linearGradient id={`n2g${className}${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff3c4" />
              <stop offset="0.45" stopColor="#f2c14e" />
              <stop offset="1" stopColor="#b98714" />
            </linearGradient>
          </defs>
          <path fill={`url(#n2g${className}${i})`} d="M12 2.4l2.9 6.1 6.7.9-4.9 4.7 1.2 6.6L12 17.4l-5.9 3.3 1.2-6.6L2.4 9.4l6.7-.9z" />
        </svg>
      ))}
    </div>
  );
}

/** Keeps the page alive if the 3D world ever throws. The shell, copy and packages keep working. */
class SceneBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

function openBooking(pkg: Package) {
  const w = window.open(pkg.squareUrl, "_blank", "noopener,noreferrer");
  if (!w || w.closed || typeof w.closed === "undefined") window.location.href = pkg.squareUrl;
}

/**
 * /nuhome2: the DrivingKlass estate. A real 3D world (headquarters, course, signals, star pad) with the packages,
 * play link and contact built into the page. Unlisted and noindex until it replaces the live homepage.
 */
export default function NuHome2() {
  const { resolvedTheme, setTheme } = useTheme();
  const night = resolvedTheme === "dark";
  const [view, setView] = useState<ViewId>("welcome");
  const [ready, setReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [lost, setLost] = useState(false);
  const [touched, setTouched] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const gl = useMemo(() => (typeof document === "undefined" ? true : hasWebGL()), []);
  const skipIntro = useMemo(() => {
    if (typeof window === "undefined") return false;
    const q = new URLSearchParams(window.location.search);
    if (q.get("intro") === "0") return true;
    try { return sessionStorage.getItem("n2-intro") === "1"; } catch { return false; }
  }, []);
  const packages = useMemo(() => getPackagesSortedByPosition(), []);
  const contactRef = useRef(false);
  contactRef.current = contactOpen;

  // Head: title, noindex, fonts.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = "DrivingKlass | Where 5 Star Drivers Are Made";
    const robots = document.createElement("meta");
    robots.name = "robots"; robots.content = "noindex, nofollow";
    document.head.appendChild(robots);
    let link = document.querySelector<HTMLLinkElement>("link[data-nuhome2-fonts]");
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet"; link.href = FONT_HREF; link.dataset.nuhome2Fonts = "true";
      document.head.appendChild(link);
    }
    return () => { document.title = prevTitle; robots.remove(); };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update(); mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!ready && gl) return;
    const t = setTimeout(() => setSplashDone(true), 700);
    return () => clearTimeout(t);
  }, [ready, gl]);
  // Never trap a visitor behind the splash: open the page after 9 s whatever happens.
  useEffect(() => { const t = setTimeout(() => setSplashDone(true), 9000); return () => clearTimeout(t); }, []);

  const select = useCallback((id: ViewId) => { setView(id); setTouched(true); }, []);
  const step = useCallback((dir: 1 | -1) => {
    setView((cur) => VIEWS[(VIEWS.findIndex((v) => v.id === cur) + dir + VIEWS.length) % VIEWS.length]!.id);
    setTouched(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (contactRef.current) { if (e.key === "Escape") setContactOpen(false); return; }
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "Escape") select("welcome");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, select]);

  const onIntroDone = useCallback(() => { setIntroDone(true); try { sessionStorage.setItem("n2-intro", "1"); } catch { /* private mode */ } }, []);
  const hero = view === "welcome";
  const copy = hero ? null : COPY[view];
  const showHint = splashDone && !touched && introDone;

  return (
    <div className="n2-root" data-theme={night ? "night" : "day"} data-view={view}>
      <div className="n2-poster" aria-hidden="true" />

      {gl && !lost && (
        <div className="n2-stage" aria-hidden="true" onPointerDown={() => setTouched(true)}>
          <SceneBoundary onFail={() => setLost(true)}>
            <Suspense fallback={null}>
              <Scene
                view={view}
                theme={night ? "night" : "day"}
                reducedMotion={reducedMotion}
                skipIntro={skipIntro}
                onReady={() => setReady(true)}
                onIntroDone={onIntroDone}
                onLost={() => setLost(true)}
              />
            </Suspense>
          </SceneBoundary>
        </div>
      )}
      <div className="n2-vignette" aria-hidden="true" />

      <header className="n2-top">
        <button type="button" className="n2-brand" onClick={() => select("welcome")} aria-label="DrivingKlass home">
          <b>DRIVING</b><b>KLASS</b>
        </button>
        <nav className="n2-nav" aria-label="Main">
          <button type="button" onClick={() => select("packages")}>Packages</button>
          <Link to="/play">Play</Link>
          <Link to="/auth">Sign in</Link>
        </nav>
        <div className="n2-top-actions">
          <a className="n2-icon n2-only-sm" href={BRAND.tel} aria-label={`Call DrivingKlass at ${BRAND.phone}`}><Phone aria-hidden="true" /></a>
          <button type="button" className="n2-icon n2-only-sm" aria-label="Send us a message" onClick={() => setContactOpen(true)}><MessageCircle aria-hidden="true" /></button>
          <button type="button" className="n2-icon" aria-label={night ? "Switch to day" : "Switch to night"} onClick={() => setTheme(night ? "light" : "dark")}>
            {night ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
          </button>
          <button type="button" className="n2-btn n2-btn--gold n2-hide-sm" onClick={() => select("packages")}>Book a Klass</button>
        </div>
      </header>

      {hero ? (
        <main className="n2-hero">
          <p className="n2-eyebrow">Welcome to</p>
          <h1 className="n2-wordmark n2-gold" aria-label={BRAND.wordmark}>{BRAND.wordmark}</h1>
          <p className="n2-slogan n2-gold">{BRAND.slogan}</p>
          <Stars />
          <div className="n2-cta">
            <button type="button" className="n2-btn n2-btn--gold" onClick={() => select("packages")}>Book a Klass</button>
            <Link to="/play" className="n2-btn n2-btn--ghost">Play the Road Test Challenge</Link>
            <button type="button" className="n2-btn n2-btn--link" onClick={() => select("hq")}>Take the tour →</button>
          </div>
        </main>
      ) : (
        <section key={view} className="n2-card" aria-live="polite">
          <p className="n2-eyebrow">{copy!.eyebrow}</p>
          <h2 className="n2-title n2-gold">{copy!.title}</h2>
          <Stars className="n2-stars--sm" />
          <p className="n2-body">{copy!.body}</p>
          {view !== "packages" && (
            <div className="n2-card-actions">
              <button type="button" className="n2-btn n2-btn--gold" onClick={() => select("packages")}>Book a Klass</button>
              <button type="button" className="n2-btn n2-btn--ghost" onClick={() => step(1)}>Next stop</button>
            </div>
          )}
        </section>
      )}

      {view === "packages" && (
        <section className="n2-sheet" aria-label="Packages">
          <div className="n2-sheet-head">
            <span>Choose a package</span>
            <button type="button" className="n2-x" aria-label="Close packages" onClick={() => select("welcome")}><X aria-hidden="true" /></button>
          </div>
          <ul className="n2-list">
            {packages.map((p) => (
              <li key={p.id}>
                <button type="button" className="n2-pkg" onClick={() => openBooking(p)} aria-label={`Book ${p.label.replace("\n", " ")} for ${formatChipPrice(p.price)}`}>
                  <span className="n2-pkg-name">{p.label.replace("\n", " ")}</span>
                  <span className="n2-pkg-price">{formatChipPrice(p.price)}</span>
                  <span className="n2-pkg-go">Book</span>
                </button>
              </li>
            ))}
          </ul>
          <a className="n2-call" href={BRAND.tel}><Phone aria-hidden="true" /> Questions? Call {BRAND.phone}</a>
        </section>
      )}

      <div className="n2-hint" data-show={showHint}>Drag to look around · pinch or scroll to zoom</div>

      <nav className="n2-dock" aria-label="Views">
        <div className="n2-dock-inner">
          {VIEWS.map((v) => (
            <button key={v.id} type="button" className="n2-chip" aria-pressed={v.id === view} onClick={() => select(v.id)}>{v.label}</button>
          ))}
        </div>
      </nav>

      <div className="n2-fab n2-hide-sm">
        <button type="button" className="n2-fab-btn" aria-label="Send us a message" onClick={() => setContactOpen(true)}><MessageCircle aria-hidden="true" /></button>
        <a className="n2-fab-btn" href={BRAND.tel} aria-label={`Call DrivingKlass at ${BRAND.phone}`}><Phone aria-hidden="true" /></a>
      </div>

      {contactOpen && (
        <div className="n2-modal" role="dialog" aria-modal="true" aria-label="Contact DrivingKlass" onClick={(e) => { if (e.target === e.currentTarget) setContactOpen(false); }}>
          <div className="n2-modal-panel bg-background text-foreground">
            <button type="button" className="n2-modal-close" aria-label="Close" onClick={() => setContactOpen(false)}><X aria-hidden="true" /></button>
            <h2 className="n2-modal-title">CONTACT DRIVINGKLASS</h2>
            <ContactForm />
          </div>
        </div>
      )}

      {lost && gl && (
        <div className="n2-lost" role="alert">
          <p>The 3D world paused to save your battery.</p>
          <button type="button" className="n2-btn n2-btn--gold" onClick={() => window.location.reload()}>Reload</button>
        </div>
      )}

      <div className="n2-splash" data-done={splashDone} aria-hidden={splashDone}>
        <div className="n2-splash-inner">
          <b className="n2-gold">{BRAND.wordmark}</b>
          <em>{BRAND.slogan}</em>
          <Stars />
          <span className="n2-bar"><i /></span>
        </div>
      </div>
    </div>
  );
}
