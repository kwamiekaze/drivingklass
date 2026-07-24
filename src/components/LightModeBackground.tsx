import { useEffect, useRef } from "react";
import lightBgMobile from "@/assets/light-bg-mobile.jpeg";
import lightBgDesktop from "@/assets/light-bg-desktop.jpeg";

const VIDEO_SRC = "/videos/light-road-loop.mp4";
const VIDEO_POSTER = "/videos/light-road-loop-poster.jpg";

export function LightModeBackground() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Pause video when off-screen to save battery/CPU (light-weight IntersectionObserver)
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    // Kick off playback (iOS requires the load-then-play sequence)
    const tryPlay = () => {
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };
    tryPlay();

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
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none transition-all duration-500">
      {/* Poster fallback image behind the video for instant paint / slow connections */}
      <div
        className="absolute inset-0 md:hidden bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url(${lightBgMobile})`,
          backgroundPosition: "center top",
        }}
      />
      <div
        className="absolute inset-0 hidden md:block bg-cover bg-no-repeat"
        style={{
          backgroundImage: `url(${lightBgDesktop})`,
          backgroundPosition: "center 30%",
        }}
      />

      {/* Full-bleed looping road video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "center 30%" }}
        src={VIDEO_SRC}
        poster={VIDEO_POSTER}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />

      {/* Subtle readability overlay - gentle top/bottom darkening only */}
      <div
        className="absolute inset-0"
        style={{
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
