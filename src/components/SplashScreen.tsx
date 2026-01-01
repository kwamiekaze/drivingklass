import { useState, useEffect } from 'react';
import '@fontsource/pinyon-script';
import goldCarSplash from '@/assets/gold-car-splash.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

// Premium champagne gold colors matching the car exactly
const GOLD = {
  metallic: '#D4A574',
  champagne: '#C9A227',
  shimmer: '#F5E6C8',
  warm: '#E8B86D',
  deep: '#9A7B4F',
  headlight: '#FFF8E7',
  glow: 'rgba(212, 165, 116, 0.35)',
};

export function SplashScreen({ onComplete, duration = 5500 }: SplashScreenProps) {
  const [phase, setPhase] = useState<'init' | 'car' | 'glow' | 'slogan' | 'hold' | 'fade'>('init');
  const [headlightPhase, setHeadlightPhase] = useState(0);
  const [glowPulse, setGlowPulse] = useState(0);

  const showCar = phase !== 'init';
  const showGlow = ['glow', 'slogan', 'hold', 'fade'].includes(phase);
  const showSlogan = ['slogan', 'hold', 'fade'].includes(phase);
  const isFading = phase === 'fade';

  // Headlight slow blink (once, then soft pulse)
  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlightPhase(p => (p + 1) % 300);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Soft glow pulse
  useEffect(() => {
    const interval = setInterval(() => {
      setGlowPulse(p => (p + 1) % 200);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  // Phase timing - under 5.5 seconds
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('car'), 300),
      setTimeout(() => setPhase('glow'), 900),
      setTimeout(() => setPhase('slogan'), 1800),
      setTimeout(() => setPhase('hold'), 3200),
      setTimeout(() => setPhase('fade'), duration - 600),
      setTimeout(onComplete, duration),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete, duration]);

  // Headlight intensity (single blink then subtle pulse)
  const headlightBlink = headlightPhase < 60 
    ? Math.sin(headlightPhase * 0.1) * 0.5 + 0.5 
    : Math.sin(headlightPhase * 0.015) * 0.15 + 0.85;

  // Glow pulse intensity
  const glowIntensity = Math.sin(glowPulse * 0.03) * 0.15 + 0.85;

  // Generate distant galaxy stars
  const galaxyStars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 1.5 + 0.5,
    opacity: Math.random() * 0.25 + 0.05,
    delay: Math.random() * 20,
    duration: 15 + Math.random() * 10,
  }));

  return (
    <div
      onClick={() => {
        setPhase('fade');
        setTimeout(onComplete, 600);
      }}
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
        opacity: isFading ? 0 : 1,
        transition: 'opacity 600ms ease-out',
      }}
    >
      {/* Full-viewport cinematic background - edge to edge */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, #0a0806 0%, #030201 50%, #000000 100%)',
        }}
      />

      {/* Deep cinematic vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.9) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Subtle ambient gold particles - distant galaxy stars */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {galaxyStars.map((star) => (
          <div
            key={star.id}
            style={{
              position: 'absolute',
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              borderRadius: '50%',
              background: GOLD.champagne,
              opacity: showGlow ? star.opacity : 0,
              transition: 'opacity 2s ease-out',
              animation: `float-particle ${star.duration}s linear infinite`,
              animationDelay: `${-star.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Glossy floor surface at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '35%',
          background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 20%, rgba(3,2,1,0.8) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main content - car centered in viewport */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Car container with floor reflection */}
        <div
          style={{
            position: 'relative',
            width: 'min(85vw, 85vh * 1.5, 700px)',
            opacity: showCar ? 1 : 0,
            transform: showCar ? 'translateY(0)' : 'translateY(32px)',
            transition: 'all 1200ms ease-out',
          }}
        >
          {/* Soft gold glow beneath car - refined, diffused, polished */}
          <div
            style={{
              position: 'absolute',
              bottom: '-8%',
              left: '10%',
              right: '10%',
              height: '40%',
              background: `radial-gradient(ellipse at center, ${GOLD.glow} 0%, rgba(212, 165, 116, 0.18) 40%, transparent 70%)`,
              opacity: showGlow ? glowIntensity : 0,
              transition: 'opacity 1.2s ease-out',
              filter: 'blur(25px)',
              pointerEvents: 'none',
            }}
          />

          {/* The gold sedan - fills container, object-fit cover behavior */}
          <img
            src={goldCarSplash}
            alt="DrivingKlass Gold Sedan"
            style={{
              width: '100%',
              height: 'auto',
              objectFit: 'contain',
              position: 'relative',
              zIndex: 10,
              filter: `drop-shadow(0 25px 50px rgba(0, 0, 0, 0.7)) brightness(${0.95 + headlightBlink * 0.08})`,
            }}
          />

          {/* Glossy floor reflection beneath car */}
          <div
            style={{
              position: 'absolute',
              bottom: '-25%',
              left: '5%',
              right: '5%',
              height: '50%',
              overflow: 'hidden',
              pointerEvents: 'none',
            }}
          >
            <img
              src={goldCarSplash}
              alt=""
              style={{
                width: '100%',
                height: 'auto',
                transform: 'scaleY(-0.4) translateY(-55%)',
                opacity: showGlow ? 0.15 : 0,
                filter: 'blur(3px) brightness(0.7)',
                maskImage: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 75%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 75%)',
                transition: 'opacity 1s ease-out',
              }}
            />
          </div>
        </div>

        {/* Slogan with luxury cursive script */}
        <div
          style={{
            position: 'relative',
            marginTop: '2rem',
            opacity: showSlogan ? 1 : 0,
            transform: showSlogan ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 1200ms ease-out',
            transitionDelay: showSlogan ? '200ms' : '0ms',
            padding: '0 1.5rem',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: '"Pinyon Script", "Dancing Script", cursive',
              fontSize: 'clamp(1.4rem, 5vw, 2.8rem)',
              fontWeight: 400,
              letterSpacing: '0.03em',
              lineHeight: 1.3,
              margin: 0,
              background: `linear-gradient(180deg, ${GOLD.shimmer} 0%, ${GOLD.warm} 35%, ${GOLD.metallic} 70%, ${GOLD.deep} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 2px 8px rgba(212, 165, 116, 0.3))',
            }}
          >
            Where 5-Star Drivers Are Made
          </h2>

          {/* Five gold stars */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.75rem',
              opacity: showSlogan ? 1 : 0,
              transform: showSlogan ? 'translateY(0)' : 'translateY(8px)',
              transition: 'all 800ms ease-out 400ms',
            }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                style={{
                  fontSize: 'clamp(1rem, 3vw, 1.5rem)',
                  background: `linear-gradient(135deg, ${GOLD.deep} 0%, ${GOLD.metallic} 40%, ${GOLD.shimmer} 60%, ${GOLD.metallic} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 1px 4px rgba(212, 165, 116, 0.4))',
                  animation: `star-glint 2.5s ease-in-out ${i * 0.15}s infinite`,
                }}
              >
                ★
              </span>
            ))}
          </div>

          {/* Subtle shimmer pass effect */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              overflow: 'hidden',
              background: `linear-gradient(90deg, transparent 0%, rgba(245, 230, 200, 0.15) 50%, transparent 100%)`,
              animation: showSlogan ? 'shimmer-pass 2.5s ease-out 0.5s forwards' : 'none',
              opacity: 0,
            }}
          />
        </div>
      </div>

      {/* Skip hint - positioned safely from edges */}
      <div
        style={{
          position: 'absolute',
          bottom: 'max(2rem, env(safe-area-inset-bottom, 2rem))',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.75rem',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: GOLD.shimmer,
          opacity: 0.25,
          pointerEvents: 'none',
        }}
      >
        Tap to enter
      </div>

      {/* Keyframes for animations */}
      <style>{`
        @keyframes float-particle {
          0% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-10vh) translateX(3vw); }
          50% { transform: translateY(-5vh) translateX(-2vw); }
          75% { transform: translateY(-15vh) translateX(1vw); }
          100% { transform: translateY(-100vh) translateX(0); }
        }
        @keyframes shimmer-pass {
          0% { opacity: 0; transform: translateX(-100%); }
          50% { opacity: 1; }
          100% { opacity: 0; transform: translateX(100%); }
        }
        @keyframes star-glint {
          0%, 100% { 
            filter: drop-shadow(0 1px 4px rgba(212, 165, 116, 0.4));
            transform: scale(1);
          }
          50% { 
            filter: drop-shadow(0 2px 8px rgba(232, 184, 109, 0.6));
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
