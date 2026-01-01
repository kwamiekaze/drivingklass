import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderBrandProps {
  className?: string;
}

export function HeaderBrand({ className }: HeaderBrandProps) {
  return (
    <header className={cn("text-center", className)}>
      {/* Brand title with glowing metallic gold effect - CashRidez style */}
      <h1 
        className={cn(
          "font-bold tracking-widest uppercase",
          "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl",
          "tracking-[0.15em]",
          "relative"
        )}
        style={{
          background: 'linear-gradient(180deg, hsl(48 90% 78%) 0%, hsl(45 85% 65%) 25%, hsl(43 80% 55%) 50%, hsl(40 75% 45%) 75%, hsl(38 70% 35%) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 20px hsl(45 80% 50% / 0.6)) drop-shadow(0 0 40px hsl(45 80% 45% / 0.4)) drop-shadow(0 0 60px hsl(45 80% 40% / 0.2))',
          textShadow: '0 0 30px hsl(45 80% 60% / 0.5)',
        }}
      >
        DRIVINGKLASS
      </h1>
      
      {/* Slogan - positioned below title, above stars */}
      <p
        className={cn(
          "font-medium tracking-wide",
          "text-sm sm:text-base md:text-lg lg:text-xl",
          "mt-3 sm:mt-4 md:mt-5",
          "tracking-[0.08em]"
        )}
        style={{
          background: 'linear-gradient(180deg, hsl(48 85% 75%) 0%, hsl(45 80% 60%) 50%, hsl(42 75% 50%) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 15px hsl(45 75% 50% / 0.5)) drop-shadow(0 0 30px hsl(45 75% 45% / 0.3))',
        }}
      >
        Where 5-Star Drivers Are Made
      </p>
      
      {/* Five stars - realistic metallic gold with glow */}
      <div className="flex justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-5 md:mt-6">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i}
            className={cn(
              "w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7"
            )}
            style={{
              fill: 'url(#goldGradientGlow)',
              stroke: 'hsl(45 80% 60%)',
              strokeWidth: 0.5,
              filter: 'drop-shadow(0 0 8px hsl(45 80% 55% / 0.7)) drop-shadow(0 0 16px hsl(45 80% 50% / 0.4))',
            }}
          />
        ))}
      </div>
      
      {/* SVG gradient definition for stars with enhanced glow */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="goldGradientGlow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(48 90% 78%)" />
            <stop offset="30%" stopColor="hsl(45 85% 62%)" />
            <stop offset="60%" stopColor="hsl(43 80% 50%)" />
            <stop offset="100%" stopColor="hsl(40 75% 40%)" />
          </linearGradient>
        </defs>
      </svg>
    </header>
  );
}
