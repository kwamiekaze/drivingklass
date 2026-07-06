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
    <div
      className="absolute"
      style={{
        top: "50%",
        left: "50%",
        width: "145%",
        height: "145%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {/* Loading spinner - fades out when video ready */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: ready ? 0 : 1,
          transition: "opacity 500ms ease-out",
          pointerEvents: "none",
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

      {/* Circular video mask centered on the car */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "100%",
          height: "100%",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          overflow: "hidden",
          opacity: ready ? 1 : 0,
          transition: "opacity 600ms ease-out",
          boxShadow:
            "inset 0 0 40px rgba(0,0,0,0.35), 0 0 60px rgba(242,193,78,0.15)",
        }}
      >
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
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "100%",
            height: "100%",
            transform: "translate(-50%, -50%)",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </div>
    </div>
  );
}
