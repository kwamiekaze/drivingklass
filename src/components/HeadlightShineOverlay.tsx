import { useState, useEffect } from "react";

interface HeadlightShineOverlayProps {
  isOn: boolean;
  triggerKey: number;
  carImageSrc: string;
}

export function HeadlightShineOverlay({ isOn, triggerKey, carImageSrc }: HeadlightShineOverlayProps) {
  const [isFlickering, setIsFlickering] = useState(false);
  const [flickerPhase, setFlickerPhase] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Handle flicker animation when triggerKey changes
  useEffect(() => {
    if (triggerKey === 0) return;
    
    if (prefersReducedMotion) {
      // No animation, just turn on instantly
      return;
    }
    
    // Start flicker sequence: OFF → ON → OFF → ON (total ~350ms)
    setIsFlickering(true);
    setFlickerPhase(0);
    
    const phases = [
      { delay: 0, phase: 0 },      // Start OFF
      { delay: 80, phase: 1 },     // ON
      { delay: 160, phase: 0 },    // OFF
      { delay: 260, phase: 1 },    // ON (final)
      { delay: 350, phase: 2 },    // End flicker, stay ON
    ];
    
    const timeouts = phases.map(({ delay, phase }) => 
      setTimeout(() => {
        setFlickerPhase(phase);
        if (phase === 2) setIsFlickering(false);
      }, delay)
    );
    
    return () => timeouts.forEach(clearTimeout);
  }, [triggerKey, prefersReducedMotion]);

  // Determine if headlight glow should be visible
  const showGlow = isOn && (
    prefersReducedMotion || 
    (!isFlickering) || 
    (isFlickering && flickerPhase === 1)
  );

  return (
    <>
      {/* Main car image */}
      <img 
        src={carImageSrc} 
        alt="DRIVINGKLASS Gold Car" 
        className="w-full h-auto object-contain relative z-10"
        style={{
          filter: 'contrast(1.08) saturate(1.05)',
          pointerEvents: 'none',
        }}
      />
      
      {/* Headlight beam overlay - CSS-based glow effect */}
      <div 
        className="absolute inset-0 z-9 pointer-events-none"
        style={{
          opacity: showGlow ? 1 : 0,
          transition: isFlickering ? 'none' : 'opacity 0.15s ease-out',
        }}
      >
        {/* Left headlight beam */}
        <div 
          style={{
            position: 'absolute',
            left: '15%',
            top: '55%',
            width: '45%',
            height: '35%',
            background: 'conic-gradient(from 200deg at 100% 20%, transparent 0deg, hsl(43 85% 75% / 0.5) 15deg, hsl(43 90% 85% / 0.7) 25deg, hsl(43 85% 75% / 0.5) 35deg, transparent 50deg)',
            filter: 'blur(8px)',
            transform: 'rotate(-15deg)',
            transformOrigin: 'right center',
          }}
        />
        
        {/* Right headlight beam */}
        <div 
          style={{
            position: 'absolute',
            left: '25%',
            top: '48%',
            width: '40%',
            height: '30%',
            background: 'conic-gradient(from 210deg at 100% 30%, transparent 0deg, hsl(43 85% 75% / 0.45) 12deg, hsl(43 90% 85% / 0.6) 22deg, hsl(43 85% 75% / 0.45) 32deg, transparent 45deg)',
            filter: 'blur(10px)',
            transform: 'rotate(-25deg)',
            transformOrigin: 'right center',
          }}
        />
        
        {/* Headlight core glow - left */}
        <div 
          style={{
            position: 'absolute',
            left: '32%',
            top: '48%',
            width: '12%',
            height: '8%',
            background: 'radial-gradient(ellipse at center, hsl(48 100% 95% / 0.95) 0%, hsl(43 90% 70% / 0.7) 40%, transparent 70%)',
            filter: 'blur(3px)',
          }}
        />
        
        {/* Headlight core glow - right */}
        <div 
          style={{
            position: 'absolute',
            left: '40%',
            top: '42%',
            width: '10%',
            height: '6%',
            background: 'radial-gradient(ellipse at center, hsl(48 100% 95% / 0.9) 0%, hsl(43 90% 70% / 0.6) 40%, transparent 70%)',
            filter: 'blur(3px)',
          }}
        />
        
        {/* Ambient golden glow around front of car */}
        <div 
          style={{
            position: 'absolute',
            left: '10%',
            top: '35%',
            width: '50%',
            height: '40%',
            background: 'radial-gradient(ellipse 80% 100% at 80% 50%, hsl(43 80% 60% / 0.25) 0%, hsl(43 70% 55% / 0.1) 40%, transparent 70%)',
            filter: 'blur(15px)',
          }}
        />
      </div>
      
      {/* Subtle ambient glow when headlights are on */}
      {isOn && !isFlickering && (
        <div 
          className="absolute inset-0 z-5 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 100% 80% at 35% 45%, hsl(43 70% 55% / 0.08) 0%, transparent 50%)',
            filter: 'blur(15px)',
            animation: 'fade-in 0.3s ease-out',
          }}
        />
      )}
    </>
  );
}
