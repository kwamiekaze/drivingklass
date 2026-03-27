import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { Loader2 } from "lucide-react";
import reportCardSplashVideo from "@/assets/report-card-splash.mov";

/**
 * RoadTestResultOpen - Splash screen route for opening road test results
 * Shows the splash video, then navigates to the road test result view
 */
export default function RoadTestResultOpen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = usePortalAuth();

  const [isFading, setIsFading] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/login?redirect=${encodeURIComponent(`/road-test-results/${sessionId}`)}`);
    }
  }, [user, authLoading, navigate, sessionId]);

  useEffect(() => {
    fallbackTimerRef.current = setTimeout(() => {
      if (!videoLoaded) handleComplete();
    }, 3000);
    return () => { if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current); };
  }, []);

  const handleComplete = () => {
    if (isFading) return;
    setIsFading(true);
    setTimeout(() => {
      navigate(`/road-test-results/${sessionId}`, { replace: true, state: { fromSplash: true } });
    }, 400);
  };

  const handleVideoLoaded = () => {
    setVideoLoaded(true);
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div
      onClick={handleComplete}
      style={{
        position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
        zIndex: 9999, overflow: "hidden", backgroundColor: "#000",
        opacity: isFading ? 0 : 1, transition: "opacity 400ms ease-out",
        cursor: "pointer", touchAction: "manipulation",
      }}
    >
      <video
        ref={videoRef}
        src={reportCardSplashVideo}
        autoPlay muted playsInline preload="auto"
        onLoadedData={handleVideoLoaded}
        onEnded={handleComplete}
        onError={handleComplete}
        style={{
          position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
          objectFit: "cover", opacity: videoLoaded ? 1 : 0,
          transition: "opacity 400ms ease-out", pointerEvents: "none",
        }}
      />
      {!videoLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ width: 40, height: 40, border: "3px solid rgba(212,165,116,0.3)", borderTopColor: "rgb(212,165,116)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {videoLoaded && (
        <div style={{
          position: "absolute", bottom: "max(5rem, calc(env(safe-area-inset-bottom, 2rem) + 3rem))",
          left: "50%", transform: "translateX(-50%)", fontSize: "0.875rem",
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "rgba(212, 165, 116, 0.8)", textShadow: "0 0 20px rgba(212, 165, 116, 0.4)",
          pointerEvents: "none", zIndex: 10,
        }}>
          Tap to continue
        </div>
      )}
    </div>
  );
}
