import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

interface HeaderBrandProps {
  className?: string;
}

export function HeaderBrand({ className }: HeaderBrandProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <header className={cn("text-center", className)}>
      {/* Brand title - Poppins ExtraBold with theme-aware styling */}
      <h1 
        className={cn(
          "font-poppins font-extrabold tracking-widest uppercase",
          "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl",
          "tracking-[0.15em]",
          "relative transition-colors duration-300",
          isDark && "text-neon-gold animate-breathing-glow"
        )}
        style={{
          color: isDark ? 'hsl(48 90% 78%)' : 'hsl(0 0% 12%)',
          textShadow: isDark 
            ? undefined
            : '0 0 2px hsl(43 75% 50% / 0.7), 0 0 10px hsl(43 75% 50% / 0.35), 1px 1px 0 hsl(43 75% 50% / 0.25), -1px -1px 0 hsl(43 75% 50% / 0.25)',
        }}
      >
        DRIVINGKLASS
      </h1>
      
      {/* Slogan - Poppins ExtraBold with theme-aware styling */}
      <p
        className={cn(
          "font-poppins font-extrabold tracking-wide",
          "text-sm sm:text-base md:text-lg lg:text-xl",
          "mt-3 sm:mt-4 md:mt-5",
          "tracking-[0.08em]",
          "transition-colors duration-300",
          isDark && "text-neon-gold animate-breathing-glow"
        )}
        style={{
          animationDelay: '0.5s',
          color: isDark ? 'hsl(48 90% 78%)' : 'hsl(0 0% 12%)',
          textShadow: isDark 
            ? undefined
            : '0 0 2px hsl(43 75% 50% / 0.8), 0 0 10px hsl(43 75% 50% / 0.4), 1px 1px 0 hsl(43 75% 50% / 0.3), -1px -1px 0 hsl(43 75% 50% / 0.3)',
        }}
      >
        Where 5-Star Drivers Are Made
      </p>
      
      {/* Five stars - theme-aware glowing */}
      <div className="flex justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-5 md:mt-6">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i}
            className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 transition-colors duration-300"
            style={{
              fill: isDark ? 'hsl(48 90% 78%)' : 'hsl(38 80% 42%)',
              stroke: isDark ? 'hsl(48 90% 78%)' : 'hsl(38 80% 42%)',
              strokeWidth: 0.5,
              filter: isDark 
                ? 'drop-shadow(0px 0px 5px rgba(255, 215, 0, 0.8)) drop-shadow(0px 0px 15px rgba(255, 215, 0, 0.5)) drop-shadow(0px 0px 30px rgba(255, 165, 0, 0.4))'
                : 'drop-shadow(0px 0px 4px hsl(43 75% 50% / 0.6)) drop-shadow(0px 0px 10px hsl(43 75% 50% / 0.35))',
            }}
          />
        ))}
      </div>
    </header>
  );
}
