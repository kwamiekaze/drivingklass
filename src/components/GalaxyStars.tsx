import { useEffect, useState, useMemo } from "react";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleDelay: number;
  layer: 'far' | 'mid' | 'near';
}

interface Nebula {
  id: number;
  x: number;
  y: number;
  size: number;
  hue: number;
  opacity: number;
}

export function GalaxyStars() {
  const [stars, setStars] = useState<Star[]>([]);
  const [nebulae, setNebulae] = useState<Nebula[]>([]);

  useEffect(() => {
    // Generate realistic galaxy stars with depth layers
    const generateStars = () => {
      const newStars: Star[] = [];
      
      // Far layer - tiny, dim stars (many)
      for (let i = 0; i < 100; i++) {
        newStars.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: 0.5 + Math.random() * 0.8,
          opacity: 0.15 + Math.random() * 0.25,
          twinkleSpeed: 4 + Math.random() * 6,
          twinkleDelay: Math.random() * 5,
          layer: 'far',
        });
      }
      
      // Mid layer - medium stars
      for (let i = 100; i < 150; i++) {
        newStars.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: 1 + Math.random() * 1.5,
          opacity: 0.3 + Math.random() * 0.4,
          twinkleSpeed: 3 + Math.random() * 4,
          twinkleDelay: Math.random() * 4,
          layer: 'mid',
        });
      }
      
      // Near layer - bright, larger stars (fewer)
      for (let i = 150; i < 170; i++) {
        newStars.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: 2 + Math.random() * 2.5,
          opacity: 0.6 + Math.random() * 0.4,
          twinkleSpeed: 2 + Math.random() * 3,
          twinkleDelay: Math.random() * 3,
          layer: 'near',
        });
      }
      
      setStars(newStars);
    };

    // Generate subtle nebula glows
    const generateNebulae = () => {
      const newNebulae: Nebula[] = [];
      for (let i = 0; i < 4; i++) {
        newNebulae.push({
          id: i,
          x: 10 + Math.random() * 80,
          y: 10 + Math.random() * 80,
          size: 150 + Math.random() * 200,
          hue: 35 + Math.random() * 15, // Gold-ish hues
          opacity: 0.03 + Math.random() * 0.04,
        });
      }
      setNebulae(newNebulae);
    };

    generateStars();
    generateNebulae();
  }, []);

  // Star color based on layer
  const getStarColor = (star: Star) => {
    const baseHue = 40 + Math.random() * 10; // Slight gold tint
    switch (star.layer) {
      case 'far':
        return `hsl(${baseHue} 20% 70% / ${star.opacity})`;
      case 'mid':
        return `hsl(${baseHue} 40% 80% / ${star.opacity})`;
      case 'near':
        return `hsl(${baseHue} 60% 85% / ${star.opacity})`;
      default:
        return `hsl(0 0% 100% / ${star.opacity})`;
    }
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Subtle nebula glows */}
      {nebulae.map((nebula) => (
        <div
          key={`nebula-${nebula.id}`}
          className="absolute rounded-full"
          style={{
            left: `${nebula.x}%`,
            top: `${nebula.y}%`,
            width: `${nebula.size}px`,
            height: `${nebula.size}px`,
            background: `radial-gradient(circle, hsl(${nebula.hue} 70% 50% / ${nebula.opacity}) 0%, transparent 70%)`,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(30px)',
          }}
        />
      ))}
      
      {/* Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: getStarColor(star),
            boxShadow: star.layer === 'near' 
              ? `0 0 ${star.size * 3}px hsl(43 70% 70% / 0.4), 0 0 ${star.size * 6}px hsl(43 70% 60% / 0.2)`
              : star.layer === 'mid'
              ? `0 0 ${star.size * 2}px hsl(43 60% 70% / 0.3)`
              : 'none',
            animation: `galaxy-twinkle ${star.twinkleSpeed}s ease-in-out infinite`,
            animationDelay: `${star.twinkleDelay}s`,
          }}
        />
      ))}
      
      {/* Shooting star (occasional) */}
      <div 
        className="absolute w-0.5 h-16 opacity-0"
        style={{
          left: '70%',
          top: '15%',
          background: 'linear-gradient(to bottom, transparent, hsl(43 80% 80%), transparent)',
          transform: 'rotate(-45deg)',
          animation: 'shooting-star 8s ease-out infinite',
          animationDelay: '5s',
        }}
      />
    </div>
  );
}
