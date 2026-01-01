import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

interface HeaderBrandProps {
  className?: string;
}

// Neon gold glow for SVG filter (drop-shadow)
const neonGoldDropShadow = `
  drop-shadow(0px 0px 5px rgba(255, 215, 0, 0.8))
  drop-shadow(0px 0px 15px rgba(255, 215, 0, 0.5))
  drop-shadow(0px 0px 30px rgba(255, 165, 0, 0.4))
`;

export function HeaderBrand({ className }: HeaderBrandProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  return (
    <header className={cn("text-center", className)}>
      {/* Brand title - Poppins ExtraBold with breathing glow */}
      <h1 
        className={cn(
          "font-poppins font-extrabold tracking-widest uppercase",
          "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl",
          "tracking-[0.15em]",
          "relative"
        )}
        style={{
          color: isLight ? '#1a1a1a' : '#FFD700',
          textShadow: isLight 
            ? '0 0 2px rgba(212, 175, 55, 0.8), 0 0 8px rgba(212, 175, 55, 0.4), 1px 1px 0 rgba(212, 175, 55, 0.3), -1px -1px 0 rgba(212, 175, 55, 0.3)'
            : undefined,
        }}
      >
        DRIVINGKLASS
      </h1>
      
      {/* Slogan - Poppins ExtraBold with breathing glow */}
      <p
        className={cn(
          "font-poppins font-extrabold tracking-wide",
          "text-sm sm:text-base md:text-lg lg:text-xl",
          "mt-3 sm:mt-4 md:mt-5",
          "tracking-[0.08em]",
          !isLight && "text-neon-gold animate-breathing-glow"
        )}
        style={{
          animationDelay: '0.5s',
          color: isLight ? '#1a1a1a' : '#FFD700',
          textShadow: isLight 
            ? '0 0 2px rgba(212, 175, 55, 0.9), 0 0 8px rgba(212, 175, 55, 0.5), 1px 1px 0 rgba(212, 175, 55, 0.4), -1px -1px 0 rgba(212, 175, 55, 0.4)'
            : undefined,
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
              fill: isLight ? '#b8860b' : '#FFD700',
              stroke: isLight ? '#b8860b' : '#FFD700',
              strokeWidth: 0.5,
              filter: isLight 
                ? 'drop-shadow(0px 0px 3px rgba(184, 134, 11, 0.6)) drop-shadow(0px 0px 8px rgba(184, 134, 11, 0.4))'
                : neonGoldDropShadow,
            }}
          />
        ))}
      </div>
    </header>
  );
}
