import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ProcessWheel } from "./components/ProcessWheel";
import { StaticFallback } from "./components/StaticFallback";
import { SceneLoader } from "./components/SceneLoader";

const PreviewScene = lazy(() => import("./scene/PreviewScene"));

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

const goldText = {
  background: "linear-gradient(135deg, #f5d68a 0%, #d4a437 55%, #8a6430 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
} as const;

function Section({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-h-screen w-full flex items-center justify-center px-6 py-24 ${className}`}
    >
      <div className="max-w-4xl w-full">{children}</div>
    </section>
  );
}

export default function Preview() {
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    setWebgl(hasWebGL());
    document.title = "The 5-Star Way to Learn to Drive | DrivingKlass";
    const prev = document.body.style.background;
    document.body.style.background = "#0a0603";
    return () => {
      document.body.style.background = prev;
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full text-amber-50">
      {/* Background gradient vignette always present */}
      <div
        className="fixed inset-0 -z-20 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, #8a6430 0%, #3a2510 40%, #1a1108 75%, #0a0603 100%)",
        }}
        aria-hidden
      />

      {/* 3D canvas fixed behind content */}
      {webgl === true && (
        <div className="fixed inset-0 -z-10">
          <Suspense fallback={<SceneLoader />}>
            <PreviewScene />
          </Suspense>
        </div>
      )}
      {webgl === false && <StaticFallback />}

      {/* Content */}
      <main className="relative z-10">
        {/* HERO */}
        <Section>
          <div className="text-center">
            <div
              className="text-xs sm:text-sm uppercase tracking-[0.4em] mb-6"
              style={{ color: "#d4a437" }}
            >
              DrivingKlass · Atlanta, GA
            </div>
            <h1
              className="font-display text-5xl sm:text-6xl md:text-7xl font-bold leading-tight mb-6"
              style={goldText}
            >
              The 5-Star Way<br />to Learn to Drive
            </h1>
            <p className="text-base sm:text-lg text-amber-50/75 max-w-xl mx-auto mb-10">
              Certified instructors. A fleet built for road-test success.
              Pickup & drop-off anywhere in metro Atlanta.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/"
                className="px-10 py-4 rounded-full font-display font-bold uppercase tracking-[0.25em] text-sm transition-transform hover:scale-[0.98] active:scale-[0.96]"
                style={{
                  background:
                    "linear-gradient(145deg, #8a6430 0%, #d4a437 50%, #f5d68a 100%)",
                  color: "#0a0603",
                  boxShadow:
                    "0 4px 30px rgba(212,164,55,0.45), inset 0 1px 0 rgba(255,240,200,0.5)",
                }}
              >
                Book Your Lesson
              </Link>
              <Link
                to="/simulator"
                className="px-8 py-4 rounded-full font-display font-medium uppercase tracking-[0.25em] text-xs text-amber-100/80 border border-amber-500/30 hover:border-amber-500/60 transition-colors"
              >
                Try the Simulator
              </Link>
            </div>
            <div className="mt-14 text-xs text-amber-50/50 uppercase tracking-[0.3em]">
              ★★★★★ 5-Star Rated · Licensed & Insured
            </div>
          </div>
        </Section>

        {/* SERVICES */}
        <Section>
          <div className="text-center">
            <div
              className="text-xs uppercase tracking-[0.4em] mb-4"
              style={{ color: "#d4a437" }}
            >
              What We Offer
            </div>
            <h2
              className="font-display text-4xl sm:text-5xl font-bold mb-12"
              style={goldText}
            >
              Built for Every Driver
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Behind-the-Wheel",
                  body: "1-hour, 2-hour, and multi-lesson packages tailored to your comfort level.",
                },
                {
                  title: "Road Test Package",
                  body: "We handle scheduling, prep, and use of our vehicle at your DDS location.",
                },
                {
                  title: "Teen & Adult",
                  body: "First-time drivers, license retakes, brush-ups — Atlanta-wide pickup.",
                },
              ].map((s) => (
                <div
                  key={s.title}
                  className="rounded-2xl p-6 text-left"
                  style={{
                    background:
                      "linear-gradient(145deg, rgba(40,25,10,0.7), rgba(15,10,5,0.8))",
                    border: "1px solid rgba(212,164,55,0.3)",
                    backdropFilter: "blur(10px)",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                  }}
                >
                  <div
                    className="font-display font-bold text-xl mb-3"
                    style={goldText}
                  >
                    {s.title}
                  </div>
                  <div className="text-sm text-amber-50/70 leading-relaxed">
                    {s.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* PROCESS */}
        <Section>
          <div className="text-center mb-14">
            <div
              className="text-xs uppercase tracking-[0.4em] mb-4"
              style={{ color: "#d4a437" }}
            >
              The Process
            </div>
            <h2
              className="font-display text-4xl sm:text-5xl font-bold"
              style={goldText}
            >
              From First Lesson to License
            </h2>
          </div>
          <ProcessWheel />
        </Section>

        {/* FINAL CTA */}
        <Section>
          <div className="text-center">
            <h2
              className="font-display text-4xl sm:text-6xl font-bold mb-6 leading-tight"
              style={goldText}
            >
              Your License.<br />Your Timeline.
            </h2>
            <p className="text-base sm:text-lg text-amber-50/75 max-w-xl mx-auto mb-10">
              Reserve your first lesson today — pickup from your door.
            </p>
            <Link
              to="/"
              className="inline-block px-12 py-5 rounded-full font-display font-bold uppercase tracking-[0.3em] text-base transition-transform hover:scale-[0.98] active:scale-[0.96]"
              style={{
                background:
                  "linear-gradient(145deg, #8a6430 0%, #d4a437 50%, #f5d68a 100%)",
                color: "#0a0603",
                boxShadow:
                  "0 6px 40px rgba(212,164,55,0.55), inset 0 1px 0 rgba(255,240,200,0.5)",
              }}
            >
              Book Your Lesson
            </Link>
            <div className="mt-16 text-xs text-amber-50/40 uppercase tracking-[0.3em]">
              /preview · candidate homepage
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
