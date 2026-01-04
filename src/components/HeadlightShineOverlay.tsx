import { useState, useEffect } from "react";
import goldCarHeadlightsOn from "@/assets/gold-car-headlights-on.png";

interface HeadlightShineOverlayProps {
  isOn: boolean;
  triggerKey: number;
  carOffSrc: string;
}

export function HeadlightShineOverlay({ isOn, triggerKey, carOffSrc }: HeadlightShineOverlayProps) {
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

  // Determine if headlights ON image should be visible
  const showHeadlightsOn = isOn && (
    prefersReducedMotion || 
    (!isFlickering) || 
    (isFlickering && flickerPhase === 1)
  );

  return (
    <>
      {/* Headlights OFF image (default) */}
      <img 
        src={carOffSrc} 
        alt="DRIVINGKLASS Gold Car" 
        className="w-full h-auto object-contain relative z-10"
        style={{
          filter: 'contrast(1.08) saturate(1.05)',
          pointerEvents: 'none',
          opacity: showHeadlightsOn ? 0 : 1,
          transition: isFlickering ? 'none' : 'opacity 0.15s ease-out',
        }}
      />
      
      {/* Headlights ON image (overlaid) */}
      <img 
        src={goldCarHeadlightsOn} 
        alt="DRIVINGKLASS Gold Car with Headlights On" 
        className="w-full h-auto object-contain absolute inset-0 z-10"
        style={{
          filter: `contrast(1.08) saturate(1.05) ${showHeadlightsOn ? 'brightness(1.02)' : 'brightness(1)'}`,
          pointerEvents: 'none',
          opacity: showHeadlightsOn ? 1 : 0,
          transition: isFlickering ? 'none' : 'opacity 0.15s ease-out',
        }}
      />
      
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
