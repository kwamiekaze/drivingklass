import { useEffect, useState, useMemo } from "react";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinkleDelay: number;
  layer: 'dust' | 'far' | 'mid' | 'near' | 'bright';
  hue: number;
}

export function GalaxyStars() {
  const stars = useMemo(() => {
    const newStars: Star[] = [];
    
    // Dust layer - thousands of tiny barely visible stars (creates density)
    for (let i = 0; i < 400; i++) {
      newStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 0.3 + Math.random() * 0.5,
        baseOpacity: 0.08 + Math.random() * 0.12,
        twinkleSpeed: 6 + Math.random() * 8,
        twinkleDelay: Math.random() * 10,
        layer: 'dust',
        hue: 35 + Math.random() * 20,
      });
    }
    
    // Far layer - tiny dim stars
    for (let i = 400; i < 700; i++) {
      newStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 0.5 + Math.random() * 0.8,
        baseOpacity: 0.15 + Math.random() * 0.2,
        twinkleSpeed: 5 + Math.random() * 7,
        twinkleDelay: Math.random() * 8,
        layer: 'far',
        hue: 38 + Math.random() * 15,
      });
    }
    
    // Mid layer - medium stars  
    for (let i = 700; i < 900; i++) {
      newStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 0.8 + Math.random() * 1.2,
        baseOpacity: 0.25 + Math.random() * 0.3,
        twinkleSpeed: 4 + Math.random() * 5,
        twinkleDelay: Math.random() * 6,
        layer: 'mid',
        hue: 40 + Math.random() * 12,
      });
    }
    
    // Near layer - visible stars
    for (let i = 900; i < 1000; i++) {
      newStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1.2 + Math.random() * 1.8,
        baseOpacity: 0.4 + Math.random() * 0.35,
        twinkleSpeed: 3 + Math.random() * 4,
        twinkleDelay: Math.random() * 5,
        layer: 'near',
        hue: 42 + Math.random() * 10,
      });
    }
    
    // Bright layer - prominent stars (fewer)
    for (let i = 1000; i < 1040; i++) {
      newStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 2 + Math.random() * 2.5,
        baseOpacity: 0.6 + Math.random() * 0.4,
        twinkleSpeed: 2 + Math.random() * 3,
        twinkleDelay: Math.random() * 4,
        layer: 'bright',
        hue: 43 + Math.random() * 8,
      });
    }
    
    return newStars;
  }, []);

  // Memoize star styles to prevent recalculation
  const getStarStyle = (star: Star) => {
    const getSaturation = () => {
      switch (star.layer) {
        case 'dust': return 15;
        case 'far': return 25;
        case 'mid': return 40;
        case 'near': return 55;
        case 'bright': return 70;
        default: return 30;
      }
    };
    
    const getLightness = () => {
      switch (star.layer) {
        case 'dust': return 65;
        case 'far': return 72;
        case 'mid': return 78;
        case 'near': return 82;
        case 'bright': return 88;
        default: return 75;
      }
    };

    const color = `hsl(${star.hue} ${getSaturation()}% ${getLightness()}% / ${star.baseOpacity})`;
    
    let boxShadow = 'none';
    if (star.layer === 'bright') {
      boxShadow = `0 0 ${star.size * 4}px hsl(${star.hue} 70% 75% / 0.5), 0 0 ${star.size * 8}px hsl(${star.hue} 60% 60% / 0.25)`;
    } else if (star.layer === 'near') {
      boxShadow = `0 0 ${star.size * 2}px hsl(${star.hue} 55% 70% / 0.3)`;
    } else if (star.layer === 'mid') {
      boxShadow = `0 0 ${star.size}px hsl(${star.hue} 40% 65% / 0.15)`;
    }

    return {
      left: `${star.x}%`,
      top: `${star.y}%`,
      width: `${star.size}px`,
      height: `${star.size}px`,
      backgroundColor: color,
      boxShadow,
      animation: `galaxy-twinkle ${star.twinkleSpeed}s ease-in-out infinite`,
      animationDelay: `${star.twinkleDelay}s`,
    };
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Deep space ambient glow - subtle golden nebula effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 30% 20%, hsl(40 60% 35% / 0.04) 0%, transparent 50%),
            radial-gradient(ellipse 100% 60% at 70% 70%, hsl(38 50% 30% / 0.03) 0%, transparent 45%),
            radial-gradient(ellipse 80% 100% at 50% 50%, hsl(42 55% 25% / 0.02) 0%, transparent 60%)
          `,
        }}
      />
      
      {/* Star field - rendered in layers for depth */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full"
          style={getStarStyle(star)}
        />
      ))}
      
      {/* Occasional shooting star */}
      <div 
        className="absolute w-[1px] h-20 opacity-0"
        style={{
          left: '75%',
          top: '10%',
          background: 'linear-gradient(to bottom, transparent, hsl(45 80% 85% / 0.8), hsl(43 70% 70% / 0.4), transparent)',
          transform: 'rotate(-45deg)',
          animation: 'shooting-star 12s ease-out infinite',
          animationDelay: '3s',
        }}
      />
      <div 
        className="absolute w-[1px] h-14 opacity-0"
        style={{
          left: '25%',
          top: '25%',
          background: 'linear-gradient(to bottom, transparent, hsl(45 80% 85% / 0.6), hsl(43 70% 70% / 0.3), transparent)',
          transform: 'rotate(-50deg)',
          animation: 'shooting-star 15s ease-out infinite',
          animationDelay: '8s',
        }}
      />
    </div>
  );
}