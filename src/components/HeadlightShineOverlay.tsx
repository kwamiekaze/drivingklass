import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface HeadlightShineOverlayProps {
  isOn: boolean;
  triggerKey: number;
}

export function HeadlightShineOverlay({ isOn, triggerKey }: HeadlightShineOverlayProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Trigger blink animation on key change
  useEffect(() => {
    if (isOn && triggerKey > 0 && !prefersReducedMotion) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 550);
      return () => clearTimeout(timer);
    }
  }, [triggerKey, isOn, prefersReducedMotion]);

  if (!isOn) return null;

  return (
    <div 
      className="absolute inset-0 pointer-events-none z-[5]"
      aria-hidden="true"
    >
      {/* Left headlight beam */}
      <div
        className={cn(
          "absolute",
          isAnimating && "animate-headlight-blink"
        )}
        style={{
          // Position at left headlight area (front-left of car)
          left: '18%',
          top: '42%',
          width: '35%',
          height: '45%',
          background: `
            conic-gradient(
              from 200deg at 100% 35%,
              transparent 0deg,
              hsl(43 85% 55% / 0.03) 15deg,
              hsl(43 80% 60% / 0.12) 25deg,
              hsl(45 90% 65% / 0.18) 35deg,
              hsl(43 80% 60% / 0.12) 45deg,
              hsl(43 85% 55% / 0.03) 55deg,
              transparent 70deg
            )
          `,
          filter: 'blur(8px)',
          opacity: prefersReducedMotion ? 1 : undefined,
          transformOrigin: 'right center',
        }}
      />
      
      {/* Left headlight glow (close bloom) */}
      <div
        className={cn(
          "absolute",
          isAnimating && "animate-headlight-blink"
        )}
        style={{
          left: '32%',
          top: '45%',
          width: '18%',
          height: '14%',
          background: 'radial-gradient(ellipse 100% 80% at center, hsl(43 90% 70% / 0.35) 0%, hsl(43 85% 60% / 0.15) 40%, transparent 70%)',
          filter: 'blur(6px)',
          opacity: prefersReducedMotion ? 1 : undefined,
        }}
      />

      {/* Right headlight beam */}
      <div
        className={cn(
          "absolute",
          isAnimating && "animate-headlight-blink"
        )}
        style={{
          // Position at right headlight area (front-right of car)
          right: '18%',
          top: '42%',
          width: '35%',
          height: '45%',
          background: `
            conic-gradient(
              from -20deg at 0% 35%,
              transparent 0deg,
              hsl(43 85% 55% / 0.03) 15deg,
              hsl(43 80% 60% / 0.12) 25deg,
              hsl(45 90% 65% / 0.18) 35deg,
              hsl(43 80% 60% / 0.12) 45deg,
              hsl(43 85% 55% / 0.03) 55deg,
              transparent 70deg
            )
          `,
          filter: 'blur(8px)',
          opacity: prefersReducedMotion ? 1 : undefined,
          transformOrigin: 'left center',
        }}
      />
      
      {/* Right headlight glow (close bloom) */}
      <div
        className={cn(
          "absolute",
          isAnimating && "animate-headlight-blink"
        )}
        style={{
          right: '32%',
          top: '45%',
          width: '18%',
          height: '14%',
          background: 'radial-gradient(ellipse 100% 80% at center, hsl(43 90% 70% / 0.35) 0%, hsl(43 85% 60% / 0.15) 40%, transparent 70%)',
          filter: 'blur(6px)',
          opacity: prefersReducedMotion ? 1 : undefined,
        }}
      />

      {/* Center ambient glow when lights are on */}
      <div
        className={cn(
          "absolute",
          isAnimating && "animate-headlight-blink"
        )}
        style={{
          left: '25%',
          right: '25%',
          top: '38%',
          height: '30%',
          background: 'radial-gradient(ellipse 100% 100% at center 60%, hsl(43 70% 55% / 0.08) 0%, transparent 60%)',
          filter: 'blur(15px)',
          opacity: prefersReducedMotion ? 1 : undefined,
        }}
      />

      {/* Subtle sparkle dust particles */}
      <div
        className={cn(
          "absolute",
          isAnimating && "animate-headlight-blink"
        )}
        style={{
          left: '20%',
          right: '20%',
          top: '40%',
          height: '35%',
          background: `
            radial-gradient(1px 1px at 20% 30%, hsl(43 90% 75% / 0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 80% 25%, hsl(43 90% 75% / 0.5) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 45% 50%, hsl(43 90% 75% / 0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 60% 70%, hsl(43 90% 75% / 0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 35% 80%, hsl(43 90% 75% / 0.4) 0%, transparent 100%)
          `,
          opacity: prefersReducedMotion ? 1 : undefined,
        }}
      />
    </div>
  );
}
