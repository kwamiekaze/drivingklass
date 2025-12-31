import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderBrandProps {
  className?: string;
}

export function HeaderBrand({ className }: HeaderBrandProps) {
  return (
    <header className={cn("text-center", className)}>
      {/* Brand title with luxury metallic effect */}
      <h1 
        className={cn(
          "font-display font-bold tracking-wide",
          "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl",
          // Gold metallic gradient text
          "bg-gradient-to-b from-gold-light via-gold to-gold-dark",
          "bg-clip-text text-transparent",
          // Text shadow for depth (using outline trick)
          "[text-shadow:0_2px_10px_hsl(var(--gold)/0.3)]",
          // Letter spacing for elegance
          "tracking-[0.05em]"
        )}
        style={{
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        DRIVINGKLASS
      </h1>
      
      {/* Five stars underneath */}
      <div className="flex justify-center gap-1 sm:gap-2 mt-2 sm:mt-3">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i}
            className={cn(
              "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6",
              "fill-gold text-gold",
              // Slight glow
              "drop-shadow-[0_0_4px_hsl(var(--gold)/0.5)]"
            )}
            style={{
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
    </header>
  );
}
