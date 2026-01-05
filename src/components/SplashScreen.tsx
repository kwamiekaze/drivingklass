import { useState, useEffect, useRef } from 'react';
import splashVideo from '@/assets/splash-video.mov';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isFading, setIsFading] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [shouldShow, setShouldShow] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check if desktop/tablet on mount - skip splash for >= 768px
  useEffect(() => {
    const isDesktopOrTablet = window.matchMedia("(min-width: 768px)").matches;
    if (isDesktopOrTablet) {
      // Skip splash entirely on desktop/tablet
      setShouldShow(false);
      onComplete();
    }
  }, [onComplete]);

  // Handle video loaded
  const handleVideoLoaded = () => {
    setVideoLoaded(true);
  };

  // Handle video ended - fade out immediately
  const handleVideoEnded = () => {
    setIsFading(true);
    setTimeout(onComplete, 600);
  };

  // Handle video error - proceed to homepage
  const handleVideoError = () => {
    setIsFading(true);
    setTimeout(onComplete, 600);
  };

  // Skip splash on click/tap
  const handleSkip = () => {
    setIsFading(true);
    setTimeout(onComplete, 600);
  };

  // Don't render anything if we shouldn't show (desktop/tablet)
  if (!shouldShow) {
    return null;
  }

  return (
    <div
      onClick={handleSkip}
      className="cursor-pointer"
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
        transition: 'opacity 600ms ease-out',
      }}
    >
      {/* Full-screen video */}
      <video
        ref={videoRef}
        src={splashVideo}
        autoPlay
        muted
        playsInline
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
          transition: 'opacity 500ms ease-out',
        }}
      />

      {/* "Tap to continue" text below the car */}
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
