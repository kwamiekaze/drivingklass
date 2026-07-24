import { useEffect, useRef } from "react";
import lightBgMobile from "@/assets/light-bg-mobile.jpeg";
import lightBgDesktop from "@/assets/light-bg-desktop.jpeg";

const VIDEO_SRC = "/videos/light-road-loop.mp4";
const VIDEO_POSTER = "/videos/light-road-loop-poster.jpg";

export function LightModeBackground() {
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
          // Retry once shortly after — some browsers need a second nudge
          setTimeout(() => {
            if (!cancelled && el.paused) {
              const r = el.play();
              if (r && typeof r.catch === "function") r.catch(() => {});
            }
          }, 250);
        });
      }
    };

    // Kick off immediately and on multiple readiness events
    tryPlay();
    el.addEventListener("loadeddata", tryPlay);
    el.addEventListener("canplay", tryPlay);
    el.addEventListener("canplaythrough", tryPlay);

    // First user interaction anywhere: force a play attempt (one-time)
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
      {/* Poster fallback image BEHIND the video (z-0). Video sits above at z-10. */}
      <div
        className="absolute inset-0 md:hidden bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url(${lightBgMobile})`,
          backgroundPosition: "center top",
          zIndex: 0,
        }}
      />
      <div
        className="absolute inset-0 hidden md:block bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url(${lightBgDesktop})`,
          backgroundPosition: "center 30%",
          zIndex: 0,
        }}
      />

      {/* Full-bleed looping road video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "center 30%", zIndex: 10 }}
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

      {/* Subtle readability overlay above video (does not block playback) */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 20,
          background: `linear-gradient(
            180deg,
            hsl(0 0% 0% / 0.18) 0%,
            hsl(0 0% 0% / 0.05) 25%,
            hsl(0 0% 0% / 0.05) 65%,
            hsl(0 0% 0% / 0.28) 100%
          )`,
        }}
      />
    </div>
  );
}
