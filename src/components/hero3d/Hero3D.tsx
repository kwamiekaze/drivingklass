import { Suspense, lazy, useEffect, useRef, useState, Component, ReactNode } from "react";
import { Link } from "react-router-dom";
import { HeaderBrand } from "@/components/HeaderBrand";

const Hero3DCanvas = lazy(() => import("./Hero3DCanvas"));

const MODEL_URL = "/models/drivingklass_gold_car_hero.glb";

// Error boundary — if the GLB 404s or three.js throws, hide the canvas
// so the rest of the page continues to render normally.
class CanvasBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function GoldSpinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="w-14 h-14 rounded-full animate-spin"
        style={{
          borderWidth: 3,
          borderStyle: "solid",
          borderColor: "hsl(43 80% 55% / 0.25)",
          borderTopColor: "hsl(43 90% 65%)",
          boxShadow: "0 0 30px hsl(43 80% 52% / 0.4)",
        }}
      />
    </div>
  );
}

export function Hero3D() {
  const [assetOk, setAssetOk] = useState<boolean | null>(null);
  const [mount, setMount] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Probe the asset before mounting the (heavy) Canvas.
  useEffect(() => {
    let cancelled = false;
    fetch(MODEL_URL, { method: "HEAD" })
      .then((r) => {
        if (cancelled) return;
        setAssetOk(r.ok);
      })
      .catch(() => !cancelled && setAssetOk(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Lazy-mount canvas when in view (mobile first-paint stays fast).
  useEffect(() => {
    if (assetOk !== true) return;
    const el = sectionRef.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setMount(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setMount(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [assetOk]);

  // If we know the asset is missing, render nothing so the page falls back
  // to the existing hero content below.
  if (assetOk === false) return null;

  return (
    <section
      ref={sectionRef}
      aria-label="DrivingKlass gold car hero"
      className="relative w-full overflow-hidden"
      style={{
        height: "100vh",
        minHeight: 560,
        background:
          "radial-gradient(ellipse at 50% 45%, #f2b76a 0%, #c8823a 35%, #8a4f22 70%, #59381a 100%)",
      }}
    >
      {/* Warm atmospheric vignette */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.35) 0%, transparent 55%)",
        }}
      />

      {/* 3D canvas */}
      <div className="absolute inset-0">
        {mount && (
          <CanvasBoundary onError={() => setAssetOk(false)}>
            <Suspense fallback={<GoldSpinner />}>
              <Hero3DCanvas modelUrl={MODEL_URL} />
            </Suspense>
          </CanvasBoundary>
        )}
        {!mount && <GoldSpinner />}
      </div>

      {/* Top: brand headline overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-6 sm:pt-10 px-4 pointer-events-none">
        <HeaderBrand />
      </div>

      {/* Bottom: CTA overlay */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pb-10 sm:pb-14 px-4 flex flex-col items-center gap-3 text-center">
        <p
          className="font-poppins text-sm sm:text-base tracking-[0.15em] uppercase"
          style={{
            color: "hsl(43 95% 88%)",
            textShadow: "0 1px 2px rgba(0,0,0,0.6), 0 0 18px rgba(0,0,0,0.35)",
          }}
        >
          Georgia&rsquo;s premier driving school
        </p>
        <Link
          to="#packages"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("packages")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="pointer-events-auto px-10 py-4 rounded-full font-bold tracking-wider uppercase text-sm transition-transform hover:scale-[1.03] active:scale-[0.97]"
          style={{
            background:
              "linear-gradient(145deg, hsl(36 75% 40%) 0%, hsl(43 88% 58%) 50%, hsl(48 90% 72%) 100%)",
            color: "hsl(28 40% 10%)",
            boxShadow:
              "0 6px 30px rgba(0,0,0,0.4), 0 0 40px hsl(43 80% 55% / 0.35), inset 0 1px 0 hsl(48 90% 82% / 0.55)",
          }}
        >
          Choose your package
        </Link>
        <span
          className="text-xs mt-1 opacity-80 animate-bounce"
          style={{ color: "hsl(43 90% 88%)" }}
          aria-hidden
        >
          ↓ scroll
        </span>
      </div>
    </section>
  );
}

export default Hero3D;
