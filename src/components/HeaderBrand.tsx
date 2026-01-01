import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderBrandProps {
  className?: string;
}

export function HeaderBrand({ className }: HeaderBrandProps) {
  return (
    <header className={cn("text-center", className)}>
      {/* Brand title with realistic metallic gold effect */}
      <h1 
        className={cn(
          "font-display font-extrabold tracking-wider",
          "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl",
          "tracking-[0.08em]",
          "relative"
        )}
        style={{
          background: 'linear-gradient(180deg, hsl(48 85% 75%) 0%, hsl(43 80% 55%) 30%, hsl(38 75% 40%) 60%, hsl(35 70% 30%) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 2px 4px hsl(0 0% 0% / 0.5)) drop-shadow(0 4px 12px hsl(43 80% 40% / 0.3))',
          textShadow: '0 1px 0 hsl(48 80% 70% / 0.3)',
        }}
      >
        DRIVINGKLASS
      </h1>
      
      {/* Five stars - realistic metallic gold */}
      <div className="flex justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i}
            className={cn(
              "w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7"
            )}
            style={{
              fill: 'url(#goldGradient)',
              stroke: 'hsl(43 80% 55%)',
              strokeWidth: 0.5,
              filter: 'drop-shadow(0 1px 3px hsl(43 80% 40% / 0.5))',
            }}
          />
        ))}
      </div>
      
      {/* SVG gradient definition for stars */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(48 85% 72%)" />
            <stop offset="40%" stopColor="hsl(43 80% 52%)" />
            <stop offset="70%" stopColor="hsl(38 75% 38%)" />
            <stop offset="100%" stopColor="hsl(35 70% 28%)" />
          </linearGradient>
        </defs>
      </svg>
    </header>
  );
}
