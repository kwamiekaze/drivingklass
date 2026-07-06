import { useEffect, useRef, useState } from "react";
import heroCarAsset from "@/assets/hero-car.mp4.asset.json";

const VIDEO_URL = heroCarAsset.url;

export default function HeroCarVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    const t = setTimeout(tryPlay, 250);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="absolute inset-0">
      {/* Loading spinner - fades out when video ready */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          opacity: ready ? 0 : 1,
          transition: "opacity 500ms ease-out",
          zIndex: 1,
        }}
      >
        <div
          className="animate-spin"
          style={{
            width: 42,
            height: 42,
            border: "3px solid rgba(242,193,78,0.25)",
            borderTopColor: "rgba(242,193,78,0.9)",
            borderRadius: "50%",
          }}
        />
      </div>

      <video
        ref={videoRef}
        src={VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onLoadedData={() => setReady(true)}
        onCanPlay={() => setReady(true)}
        className="absolute inset-0 w-full h-full"
        style={{
          objectFit: "cover",
          objectPosition: "center",
          opacity: ready ? 1 : 0,
          transition: "opacity 600ms ease-out",
        }}
      />
    </div>
  );
}
