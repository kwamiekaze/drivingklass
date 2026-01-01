import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderBrandProps {
  className?: string;
}

// Neon gold glow layering for text-shadow
const neonGoldTextShadow = `
  0px 0px 5px rgba(255, 215, 0, 0.8),
  0px 0px 15px rgba(255, 215, 0, 0.5),
  0px 0px 30px rgba(255, 165, 0, 0.4)
`;

// Neon gold glow for SVG filter (drop-shadow)
const neonGoldDropShadow = `
  drop-shadow(0px 0px 5px rgba(255, 215, 0, 0.8))
  drop-shadow(0px 0px 15px rgba(255, 215, 0, 0.5))
  drop-shadow(0px 0px 30px rgba(255, 165, 0, 0.4))
`;

export function HeaderBrand({ className }: HeaderBrandProps) {
  return (
    <header className={cn("text-center", className)}>
      {/* Brand title - Neon Gold Marquee effect */}
      <h1 
        className={cn(
          "font-extrabold tracking-widest uppercase",
          "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl",
          "tracking-[0.15em]",
          "relative"
        )}
        style={{
          color: '#FFD700',
          textShadow: neonGoldTextShadow,
        }}
      >
        DRIVINGKLASS
      </h1>
      
      {/* Slogan - Neon Gold glow matching the heading */}
      <p
        className={cn(
          "font-bold tracking-wide",
          "text-sm sm:text-base md:text-lg lg:text-xl",
          "mt-3 sm:mt-4 md:mt-5",
          "tracking-[0.08em]"
        )}
        style={{
          color: '#FFD700',
          textShadow: neonGoldTextShadow,
        }}
      >
        Where 5-Star Drivers Are Made
      </p>
      
      {/* Five stars - glowing neon gold like lit-up lights */}
      <div className="flex justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-5 md:mt-6">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i}
            className={cn(
              "w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7"
            )}
            style={{
              fill: '#FFD700',
              stroke: '#FFD700',
              strokeWidth: 0.5,
              filter: neonGoldDropShadow,
            }}
          />
        ))}
      </div>
    </header>
  );
}
