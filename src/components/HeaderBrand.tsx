import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderBrandProps {
  className?: string;
}

export function HeaderBrand({ className }: HeaderBrandProps) {
  return (
    <header className={cn("text-center", className)}>
      {/* SVG defs for gold star gradient fill */}
      <svg
        aria-hidden="true"
        focusable="false"
        width="0"
        height="0"
        style={{ position: "absolute", width: 0, height: 0 }}
      >
        <defs>
          <linearGradient
            id="hero-gold-star-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#8B6508" />
            <stop offset="35%" stopColor="#D9A441" />
            <stop offset="55%" stopColor="#FFF3C4" />
            <stop offset="75%" stopColor="#F2C14E" />
            <stop offset="100%" stopColor="#8B6508" />
          </linearGradient>
        </defs>
      </svg>

      {/* Brand title */}
      <h1
        className={cn(
          "font-poppins font-extrabold uppercase",
          "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl",
          "tracking-[0.15em]",
          "hero-gold-text"
        )}
      >
        DRIVINGKLASS
      </h1>

      {/* Slogan */}
      <p
        className={cn(
          "font-poppins font-extrabold",
          "text-sm sm:text-base md:text-lg lg:text-xl",
          "mt-3 sm:mt-4 md:mt-5",
          "tracking-[0.08em]",
          "hero-gold-text hero-gold-text--slogan"
        )}
      >
        Where 5-Star Drivers Are Made
      </p>

      {/* Five stars */}
      <div className="flex justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-5 md:mt-6">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              "w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7",
              "hero-gold-star",
              `hero-gold-star--${i}`
            )}
            strokeWidth={0.5}
            stroke="#8B6508"
          />
        ))}
      </div>
    </header>
  );
}
