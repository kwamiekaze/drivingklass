import { useMemo } from "react";

interface RoadElement {
  id: number;
  type: 'dash' | 'arrow' | 'parking-line' | 'cone';
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  scale: number;
}

export function LightModeBackground() {
  const roadElements = useMemo(() => {
    const elements: RoadElement[] = [];
    
    // Dashed road lines - horizontal rows
    for (let i = 0; i < 14; i++) {
      elements.push({
        id: i,
        type: 'dash',
        x: 4 + (i * 7),
        y: 18 + Math.random() * 8,
        rotation: 0,
        opacity: 0.08 + Math.random() * 0.04,
        scale: 0.9 + Math.random() * 0.4,
      });
    }

    // More dashed lines at bottom
    for (let i = 14; i < 28; i++) {
      elements.push({
        id: i,
        type: 'dash',
        x: 2 + ((i - 14) * 7.5),
        y: 72 + Math.random() * 12,
        rotation: 0,
        opacity: 0.07 + Math.random() * 0.04,
        scale: 0.8 + Math.random() * 0.5,
      });
    }

    // Parking guide lines - vertical
    for (let i = 28; i < 38; i++) {
      elements.push({
        id: i,
        type: 'parking-line',
        x: 6 + ((i - 28) * 10),
        y: 38 + Math.random() * 18,
        rotation: 90,
        opacity: 0.06 + Math.random() * 0.03,
        scale: 0.6 + Math.random() * 0.4,
      });
    }

    // Arrows pointing various directions
    for (let i = 38; i < 48; i++) {
      elements.push({
        id: i,
        type: 'arrow',
        x: 8 + Math.random() * 84,
        y: 15 + Math.random() * 65,
        rotation: Math.floor(Math.random() * 4) * 90,
        opacity: 0.055 + Math.random() * 0.03,
        scale: 0.5 + Math.random() * 0.35,
      });
    }

    // Safety cones scattered - more visible
    for (let i = 48; i < 60; i++) {
      elements.push({
        id: i,
        type: 'cone',
        x: 4 + Math.random() * 92,
        y: 8 + Math.random() * 82,
        rotation: -6 + Math.random() * 12,
        opacity: 0.09 + Math.random() * 0.05,
        scale: 0.45 + Math.random() * 0.35,
      });
    }

    return elements;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none transition-all duration-500">
      {/* Warm cream base gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            180deg,
            hsl(42 55% 97%) 0%,
            hsl(42 50% 95%) 25%,
            hsl(40 45% 93%) 50%,
            hsl(38 40% 91%) 75%,
            hsl(36 35% 89%) 100%
          )`,
        }}
      />

      {/* Soft sky-blue atmosphere at top (spring morning) */}
      <div
        className="absolute inset-x-0 top-0 h-[45%]"
        style={{
          background:
            "linear-gradient(180deg, hsl(200 60% 92% / 0.7) 0%, hsl(200 55% 90% / 0.35) 50%, transparent 100%)",
        }}
      />

      {/* Warm golden sunlight overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 110% 70% at 50% -5%, hsl(45 65% 95% / 0.9) 0%, transparent 50%),
            radial-gradient(ellipse 90% 55% at 25% 15%, hsl(43 75% 93% / 0.5) 0%, transparent 40%),
            radial-gradient(ellipse 80% 50% at 75% 80%, hsl(40 60% 92% / 0.45) 0%, transparent 38%)
          `,
        }}
      />

      {/* Subtle golden atmospheric glow in center */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 75% 60% at 50% 45%, hsl(43 75% 55% / 0.1) 0%, transparent 55%)`,
        }}
      />

      {/* Soft asphalt wash at the bottom (parking lot feel) */}
      <div
        className="absolute inset-x-0 bottom-0 h-[50%]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, hsl(0 0% 20% / 0.04) 40%, hsl(0 0% 18% / 0.09) 70%, hsl(0 0% 15% / 0.14) 100%)",
        }}
      />
      
      {/* Road texture elements SVG */}
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Dash pattern */}
          <pattern id="dash" width="4" height="1" patternUnits="userSpaceOnUse">
            <rect width="2.5" height="0.6" fill="hsl(43 65% 55%)" rx="0.2" />
          </pattern>
          
          {/* Arrow shape */}
          <symbol id="arrow" viewBox="0 0 10 10">
            <path 
              d="M5 0 L10 8 L7 8 L7 10 L3 10 L3 8 L0 8 Z" 
              fill="hsl(43 60% 58%)"
            />
          </symbol>
          
          {/* Parking line */}
          <symbol id="parking-line" viewBox="0 0 2 20">
            <rect width="2" height="20" fill="hsl(0 0% 40%)" rx="0.5" />
          </symbol>
          
          {/* Safety cone - more detailed and visible */}
          <symbol id="cone" viewBox="0 0 12 16">
            <path 
              d="M6 0 L11 14 L10 16 L2 16 L1 14 Z" 
              fill="hsl(28 100% 55%)"
            />
            <rect x="0" y="14" width="12" height="2" fill="hsl(0 0% 22%)" rx="0.5" />
            <rect x="2.5" y="4" width="7" height="1.8" fill="hsl(0 0% 96%)" rx="0.3" />
            <rect x="1.8" y="8.5" width="8.4" height="1.8" fill="hsl(0 0% 96%)" rx="0.3" />
          </symbol>
        </defs>
        
        {roadElements.map((el) => {
          if (el.type === 'dash') {
            return (
              <rect
                key={el.id}
                x={el.x}
                y={el.y}
                width={9 * el.scale}
                height={0.5}
                fill="hsl(43 55% 58%)"
                opacity={el.opacity}
                rx="0.25"
                transform={`rotate(${el.rotation} ${el.x + 4.5 * el.scale} ${el.y + 0.25})`}
              />
            );
          }
          
          if (el.type === 'parking-line') {
            return (
              <rect
                key={el.id}
                x={el.x}
                y={el.y}
                width={0.35}
                height={14 * el.scale}
                fill="hsl(0 0% 45%)"
                opacity={el.opacity}
                rx="0.15"
              />
            );
          }
          
          if (el.type === 'arrow') {
            return (
              <use
                key={el.id}
                href="#arrow"
                x={el.x}
                y={el.y}
                width={3.5 * el.scale}
                height={4.5 * el.scale}
                opacity={el.opacity}
                transform={`rotate(${el.rotation} ${el.x + 1.75 * el.scale} ${el.y + 2.25 * el.scale})`}
              />
            );
          }
          
          if (el.type === 'cone') {
            return (
              <use
                key={el.id}
                href="#cone"
                x={el.x}
                y={el.y}
                width={2.5 * el.scale}
                height={3.5 * el.scale}
                opacity={el.opacity}
                transform={`rotate(${el.rotation} ${el.x + 1.25 * el.scale} ${el.y + 1.75 * el.scale})`}
              />
            );
          }
          
          return null;
        })}
      </svg>
      
      {/* Subtle classroom-style grid overlay */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(hsl(43 55% 55% / 0.04) 1px, transparent 1px),
            linear-gradient(90deg, hsl(43 55% 55% / 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />
    </div>
  );
}
