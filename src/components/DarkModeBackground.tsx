import { useEffect, useRef } from "react";
import { GalaxyStars } from "@/components/GalaxyStars";

const VIDEO_SRC = "/videos/night-road-loop.mp4";
const VIDEO_POSTER = "/videos/night-road-loop-poster.jpg";

export function DarkModeBackground() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let cancelled = false;
    const tryPlay = () => {
      if (cancelled || !el) return;
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          setTimeout(() => {
            if (!cancelled && el.paused) {
              const r = el.play();
              if (r && typeof r.catch === "function") r.catch(() => {});
            }
          }, 250);
        });
      }
    };

    tryPlay();
    el.addEventListener("loadeddata", tryPlay);
    el.addEventListener("canplay", tryPlay);
    el.addEventListener("canplaythrough", tryPlay);

    const onFirstInteract = () => {
      tryPlay();
      window.removeEventListener("touchstart", onFirstInteract);
      window.removeEventListener("click", onFirstInteract);
      window.removeEventListener("keydown", onFirstInteract);
    };
    window.addEventListener("touchstart", onFirstInteract, { once: true, passive: true });
    window.addEventListener("click", onFirstInteract, { once: true });
    window.addEventListener("keydown", onFirstInteract, { once: true });

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) tryPlay();
          else el.pause();
        }
      },
      { threshold: 0.01 }
    );
    io.observe(el);

    const onVisibility = () => {
      if (document.hidden) el.pause();
      else tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      el.removeEventListener("loadeddata", tryPlay);
      el.removeEventListener("canplay", tryPlay);
      el.removeEventListener("canplaythrough", tryPlay);
      window.removeEventListener("touchstart", onFirstInteract);
      window.removeEventListener("click", onFirstInteract);
      window.removeEventListener("keydown", onFirstInteract);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none transition-all duration-500">
      {/* Fallback layer BEHIND video: rich black gradient + galaxy stars */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 0,
          background:
            "linear-gradient(180deg, hsl(30 15% 4%) 0%, hsl(0 0% 2%) 30%, hsl(0 0% 1%) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          zIndex: 1,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 35%, hsl(40 80% 30% / 0.12) 0%, transparent 60%)",
        }}
      />
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        <GalaxyStars />
      </div>

      {/* Full-bleed looping night road video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "center 35%", zIndex: 10 }}
        src={VIDEO_SRC}
        poster={VIDEO_POSTER}
        autoPlay
        muted
        loop
        playsInline
        {...({ "webkit-playsinline": "true" } as Record<string, string>)}
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
      />

      {/* Readability overlay above video for gold text/wheel contrast */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 20,
          background: `linear-gradient(
            180deg,
            hsl(0 0% 0% / 0.45) 0%,
            hsl(0 0% 0% / 0.22) 30%,
            hsl(0 0% 0% / 0.25) 65%,
            hsl(0 0% 0% / 0.55) 100%
          )`,
        }}
      />
    </div>
  );
}
