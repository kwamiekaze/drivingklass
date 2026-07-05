import { useState, useEffect, useRef } from 'react';
import splashVideoAsset from '@/assets/splash-video.mov.asset.json';

const splashVideo = splashVideoAsset.url;

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isFading, setIsFading] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoErrored, setVideoErrored] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Force play on mount — some PWAs / shortcut launches skip autoplay
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const tryPlay = () => {
      v.play().catch(() => {
        // If autoplay blocked, still show splash — user can tap
      });
    };
    tryPlay();
    // Retry once shortly after — helps on iOS PWA cold-start
    const t = setTimeout(tryPlay, 250);
    return () => clearTimeout(t);
  }, []);

  const finish = () => {
    if (isFading) return;
    setIsFading(true);
    setTimeout(onComplete, 600);
  };

  return (
    <div
      onClick={finish}
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
      <video
        ref={videoRef}
        src={splashVideo}
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedData={() => setVideoLoaded(true)}
        onEnded={finish}
        onError={() => setVideoErrored(true)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: videoLoaded && !videoErrored ? 1 : 0,
          transition: 'opacity 500ms ease-out',
        }}
      />

      {/* Tap to continue — always visible so user can dismiss */}
      <div
        style={{
          position: 'absolute',
          bottom: 'max(5rem, calc(env(safe-area-inset-bottom, 2rem) + 3rem))',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.875rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(212, 165, 116, 0.9)',
          textShadow: '0 0 20px rgba(212, 165, 116, 0.5)',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        Tap to continue
      </div>
    </div>
  );
}
