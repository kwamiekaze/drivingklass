import { useState, useEffect, useRef } from 'react';
import reportCardSplashVideo from '@/assets/report-card-splash.mov';

interface ReportCardSplashProps {
  userId: string;
  userRole: string | null;
  onComplete: () => void;
}

const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes
const FALLBACK_TIMEOUT_MS = 3000; // 3 seconds

function getStorageKey(userId: string) {
  return `reportCardSplashLastShown_${userId}`;
}

function shouldShowSplash(userId: string, role: string | null): boolean {
  // Only show for student and instructor roles
  if (!role || !['student', 'instructor'].includes(role)) {
    return false;
  }

  // Check cooldown
  const lastShown = localStorage.getItem(getStorageKey(userId));
  if (lastShown) {
    const elapsed = Date.now() - parseInt(lastShown, 10);
    if (elapsed < COOLDOWN_MS) {
      return false;
    }
  }

  return true;
}

function markSplashShown(userId: string) {
  localStorage.setItem(getStorageKey(userId), Date.now().toString());
}

export function ReportCardSplash({ userId, userRole, onComplete }: ReportCardSplashProps) {
  const [isFading, setIsFading] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if we should show the splash
    if (shouldShowSplash(userId, userRole)) {
      setShouldShow(true);
      markSplashShown(userId);
      
      // Set fallback timer in case video fails to load
      fallbackTimerRef.current = setTimeout(() => {
        if (!videoLoaded) {
          handleComplete();
        }
      }, FALLBACK_TIMEOUT_MS);
    } else {
      // Skip splash entirely
      onComplete();
    }

    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
    };
  }, [userId, userRole, onComplete]);

  const handleComplete = () => {
    if (isFading) return;
    setIsFading(true);
    setTimeout(onComplete, 500);
  };

  const handleVideoLoaded = () => {
    setVideoLoaded(true);
    // Clear fallback timer since video loaded successfully
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }
  };

  const handleVideoEnded = () => {
    handleComplete();
  };

  const handleVideoError = () => {
    // Video failed to load, proceed immediately
    handleComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  // Don't render if we shouldn't show
  if (!shouldShow) {
    return null;
  }

  return (
    <div
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
        transition: 'opacity 500ms ease-out',
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

      {/* Skip button - top right */}
      <button
        onClick={handleSkip}
        aria-label="Skip intro"
        style={{
          position: 'absolute',
          top: 'max(1rem, env(safe-area-inset-top, 1rem))',
          right: 'max(1rem, env(safe-area-inset-right, 1rem))',
          padding: '0.75rem 1.25rem',
          minHeight: '44px',
          minWidth: '44px',
          fontSize: '0.875rem',
          fontWeight: 500,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: 'rgba(212, 165, 116, 0.9)',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(212, 165, 116, 0.3)',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          zIndex: 10,
          transition: 'all 200ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(212, 165, 116, 0.2)';
          e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
          e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.3)';
        }}
      >
        Skip
      </button>

      {/* Loading text - bottom center */}
      <div
        style={{
          position: 'absolute',
          bottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.75rem',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'rgba(212, 165, 116, 0.6)',
          textShadow: '0 0 20px rgba(212, 165, 116, 0.3)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        Loading Report Card…
      </div>
    </div>
  );
}
