import { useState, useEffect, useRef } from 'react';
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

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-600 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ 
        background: 'radial-gradient(ellipse at center, #0a0806 0%, #030201 50%, #000000 100%)',
        zIndex: 9999 
      }}
    >
      {/* Deep cinematic vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.9) 100%)',
        }}
      />

      {/* Subtle ambient gold particles (very distant, no clouds) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 1.5 + 0.5}px`,
              height: `${Math.random() * 1.5 + 0.5}px`,
              background: GOLD.champagne,
              opacity: showGlow ? (Math.random() * 0.25 + 0.05) : 0,
              transition: 'opacity 2s ease-out',
              animation: `float-particle ${15 + Math.random() * 10}s linear infinite`,
              animationDelay: `${-Math.random() * 20}s`,
            }}
          />
        ))}
      </div>

      {/* Main content container - 9:16 safe */}
      <div
        className="relative flex flex-col items-center justify-center"
        style={{
          maxWidth: '100vw',
          padding: '0 5%',
        }}
      >
        {/* Car container with floor reflection */}
        <div
          className={`relative transition-all ease-out ${
            showCar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ 
            width: 'clamp(280px, 70vw, 500px)',
            transitionDuration: '1200ms',
          }}
        >
          {/* Soft gold glow beneath car (diffused, realistic) */}
          <div
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              bottom: '-5%',
              width: '85%',
              height: '35%',
              background: `radial-gradient(ellipse at center, ${GOLD.glow} 0%, rgba(212, 165, 116, 0.15) 40%, transparent 70%)`,
              opacity: showGlow ? glowIntensity : 0,
              transition: 'opacity 1.2s ease-out',
              filter: 'blur(20px)',
            }}
          />

          {/* The gold sedan */}
          <img
            src={goldCarSplash}
            alt="DrivingKlass Gold Sedan"
            className="w-full h-auto relative z-10"
            style={{
              filter: `drop-shadow(0 25px 40px rgba(0, 0, 0, 0.7)) brightness(${0.95 + headlightBlink * 0.08})`,
            }}
          />

          {/* Glossy floor reflection */}
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[100%] overflow-hidden pointer-events-none"
            style={{ 
              bottom: '-20%',
              height: '45%',
            }}
          >
            <img
              src={goldCarSplash}
              alt=""
              className="w-full h-auto"
              style={{
                transform: 'scaleY(-0.4) translateY(-60%)',
                opacity: showGlow ? 0.18 : 0,
                filter: 'blur(2px) brightness(0.8)',
                maskImage: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 80%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 80%)',
                transition: 'opacity 1s ease-out',
              }}
            />
          </div>
        </div>

        {/* Slogan with luxury cursive script */}
        <div
          className={`relative mt-8 transition-all ease-out ${
            showSlogan ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{
            transitionDuration: '1200ms',
            transitionDelay: showSlogan ? '200ms' : '0ms',
          }}
        >
          <h2
            className="text-center"
            style={{
              fontFamily: '"Pinyon Script", "Dancing Script", cursive',
              fontSize: 'clamp(1.4rem, 5vw, 2.8rem)',
              fontWeight: 400,
              letterSpacing: '0.03em',
              lineHeight: 1.3,
              background: `linear-gradient(180deg, ${GOLD.shimmer} 0%, ${GOLD.warm} 35%, ${GOLD.metallic} 70%, ${GOLD.deep} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              filter: 'drop-shadow(0 2px 8px rgba(212, 165, 116, 0.3))',
            }}
          >
            Where 5-Star Drivers Are Made
          </h2>

          {/* Subtle shimmer pass effect */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              background: `linear-gradient(90deg, transparent 0%, rgba(245, 230, 200, 0.15) 50%, transparent 100%)`,
              animation: showSlogan ? 'shimmer-pass 2.5s ease-out forwards' : 'none',
              animationDelay: '0.5s',
              opacity: 0,
            }}
          />
        </div>
      </div>

      {/* Skip button - mobile safe positioning */}
      <button
        onClick={onComplete}
        className="absolute bottom-[8%] left-1/2 -translate-x-1/2 text-xs tracking-[0.2em] uppercase opacity-20 hover:opacity-40 transition-opacity"
        style={{ color: GOLD.shimmer }}
      >
        Skip
      </button>

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
      `}</style>
    </div>
  );
}
