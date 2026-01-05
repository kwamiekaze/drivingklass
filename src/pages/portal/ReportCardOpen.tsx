import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { Loader2 } from "lucide-react";
import reportCardSplashVideo from "@/assets/report-card-splash.mov";

/**
 * ReportCardOpen - Splash screen route for opening report cards
 * Shows the 6-second splash video, then navigates to the actual report card view
 * Tap anywhere to skip
 */
export default function ReportCardOpen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, isLoading: authLoading } = usePortalAuth();
  
  const [isFading, setIsFading] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      const redirectPath = encodeURIComponent(`/report-cards/${id}`);
      navigate(`/login?redirect=${redirectPath}`);
    }
  }, [user, authLoading, navigate, id, location.pathname]);

  // Set fallback timer in case video fails to load
  useEffect(() => {
    fallbackTimerRef.current = setTimeout(() => {
      if (!videoLoaded) {
        handleComplete();
      }
    }, 3000);

    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, []);

  const handleComplete = () => {
    if (isFading) return;
    setIsFading(true);
    
    // Navigate to actual report card page with autoplay flag
    setTimeout(() => {
      navigate(`/report-cards/${id}`, { 
        replace: true,
        state: { fromSplash: true, attemptAutoplay: true } 
      });
    }, 400);
  };

  const handleVideoLoaded = () => {
    setVideoLoaded(true);
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }
  };

  const handleVideoEnded = () => {
    handleComplete();
  };

  const handleVideoError = () => {
    handleComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div
      onClick={handleSkip}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        backgroundColor: '#000000',
        opacity: isFading ? 0 : 1,
        transition: 'opacity 400ms ease-out',
        cursor: 'pointer',
        touchAction: 'manipulation',
      }}
    >
      {/* Full-screen video */}
      <video
        ref={videoRef}
        src={reportCardSplashVideo}
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedData={handleVideoLoaded}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: videoLoaded ? 1 : 0,
          transition: 'opacity 400ms ease-out',
          pointerEvents: 'none',
        }}
      />

      {/* Loading spinner (shown while video loads) */}
      {!videoLoaded && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(212, 165, 116, 0.3)',
              borderTopColor: 'rgb(212, 165, 116)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <style>
            {`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}

      {/* "Tap to continue" text below the visual */}
      {videoLoaded && (
        <div
          style={{
            position: 'absolute',
            bottom: 'max(5rem, calc(env(safe-area-inset-bottom, 2rem) + 3rem))',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.875rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(212, 165, 116, 0.8)',
            textShadow: '0 0 20px rgba(212, 165, 116, 0.4)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          Tap to continue
        </div>
      )}
    </div>
  );
}
