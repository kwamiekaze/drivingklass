import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HeaderBrand } from "./HeaderBrand";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "./ThemeProvider";
import { SoundProvider } from "./home3d/SoundManager";
import { MuteToggle } from "./home3d/MuteToggle";
import { PosterFallback } from "./home3d/PosterFallback";
import { useCapabilityTier } from "./home3d/useCapabilityTier";
import portalCarIcon from "@/assets/portal-car-icon.png";

const Hero3DScene = lazy(() =>
  import("./home3d/Hero3DScene").then((m) => ({ default: m.Hero3DScene }))
);

interface HeroSectionProps {
  splashComplete?: boolean;
}

const TAGLINE = "Where 5-Star Drivers Are Made";

export function HeroSection({ splashComplete = true }: HeroSectionProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const tier = useCapabilityTier();
  const [showTitle, setShowTitle] = useState(false);

  useEffect(() => {
    if (!splashComplete) return;
    const t = setTimeout(() => setShowTitle(true), 220);
    return () => clearTimeout(t);
  }, [splashComplete]);

  return (
    <SoundProvider>
      <section
        className="relative w-full overflow-hidden"
        style={{ minHeight: "100dvh" }}
      >
        {/* Header row with theme toggle and portal button */}
        <div className="relative z-20 w-full flex items-center justify-between px-4 pt-6 sm:pt-8">
          <ThemeToggle />
          <Link
            to="/auth"
            className="p-1.5 rounded-full bg-card/40 border border-gold/30 hover:border-gold/60 hover:bg-gold/10 transition-all duration-300 backdrop-blur-sm group"
            title="Klassroom Portal"
            aria-label="Klassroom Portal"
          >
            <img
              src={portalCarIcon}
              alt="Klassroom Portal"
              className="w-8 h-8 object-contain group-hover:scale-110 transition-transform drop-shadow-[0_0_4px_rgba(212,175,55,0.5)]"
            />
          </Link>
        </div>

        {/* Brand */}
        <div className="relative z-20 px-4">
          <HeaderBrand className="mt-4 sm:mt-6" />
        </div>

        {/* Tagline — real H1 for SEO / a11y */}
        <div className="relative z-20 px-4 mt-6 sm:mt-8 text-center pointer-events-none">
          <h1
            className="font-bold tracking-wider mx-auto"
            style={{
              fontSize: "clamp(30px, 6.5vw, 60px)",
              lineHeight: 1.02,
              letterSpacing: "0.02em",
              background:
                "linear-gradient(135deg, hsl(38 75% 45%), hsl(43 85% 55%) 40%, hsl(48 90% 72%) 60%, hsl(43 85% 55%))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 2px 14px rgba(0,0,0,0.55))",
              maxWidth: "18ch",
            }}
          >
            {TAGLINE.split(" ").map((word, i) => (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  marginRight: "0.35ch",
                  opacity: showTitle ? 1 : 0,
                  transform: showTitle
                    ? "translateY(0)"
                    : "translateY(14px)",
                  transition: `opacity 620ms ease ${i * 90}ms, transform 620ms ease ${i * 90}ms`,
                }}
              >
                {word}
              </span>
            ))}
          </h1>
        </div>

        {/* 3D canvas or static poster, positioned to fill hero */}
        <div
          className="relative"
          style={{ height: "min(78dvh, 720px)", minHeight: 460 }}
        >
          {tier === "poster" ? (
            <div className="absolute inset-0 overflow-auto">
              <PosterFallback />
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="absolute inset-0">
                  <PosterFallback />
                </div>
              }
            >
              <Hero3DScene tier={tier} isDark={isDark} />
            </Suspense>
          )}
        </div>

        {tier !== "poster" && <MuteToggle />}
      </section>
    </SoundProvider>
  );
}
