import { Star } from "lucide-react";

interface AnimatedStarsProps {
  count?: number;
}

export function AnimatedStars({ count = 5 }: AnimatedStarsProps) {
  return (
    <div className="flex items-center justify-center gap-1 relative">
      {/* Orbital animation container */}
      <div className="absolute inset-0 animate-orbit-reverse opacity-20">
        <div className="absolute top-1/2 left-0 w-2 h-2 rounded-full bg-gold-shimmer" style={{ transform: 'translateY(-50%)' }} />
        <div className="absolute top-1/2 right-0 w-2 h-2 rounded-full bg-gold-shimmer" style={{ transform: 'translateY(-50%)' }} />
      </div>
      
      {Array.from({ length: count }).map((_, index) => (
        <Star
          key={index}
          className="w-5 h-5 md:w-6 md:h-6 fill-gold text-gold animate-star-twinkle"
          style={{
            animationDelay: `${index * 0.2}s`,
            filter: 'drop-shadow(0 0 4px hsl(43 74% 49% / 0.6))',
          }}
        />
      ))}
    </div>
  );
}
