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
    
    // Dashed road lines - horizontal
    for (let i = 0; i < 12; i++) {
      elements.push({
        id: i,
        type: 'dash',
        x: 5 + (i * 8),
        y: 15 + Math.random() * 10,
        rotation: 0,
        opacity: 0.03 + Math.random() * 0.02,
        scale: 0.8 + Math.random() * 0.4,
      });
    }
    
    // More dashed lines at bottom
    for (let i = 12; i < 24; i++) {
      elements.push({
        id: i,
        type: 'dash',
        x: 3 + ((i - 12) * 8.5),
        y: 75 + Math.random() * 15,
        rotation: 0,
        opacity: 0.025 + Math.random() * 0.02,
        scale: 0.7 + Math.random() * 0.5,
      });
    }
    
    // Parking guide lines - vertical
    for (let i = 24; i < 32; i++) {
      elements.push({
        id: i,
        type: 'parking-line',
        x: 8 + ((i - 24) * 12),
        y: 40 + Math.random() * 20,
        rotation: 90,
        opacity: 0.025 + Math.random() * 0.015,
        scale: 0.6 + Math.random() * 0.4,
      });
    }
    
    // Arrows pointing various directions
    for (let i = 32; i < 40; i++) {
      elements.push({
        id: i,
        type: 'arrow',
        x: 10 + Math.random() * 80,
        y: 20 + Math.random() * 60,
        rotation: Math.floor(Math.random() * 4) * 90,
        opacity: 0.02 + Math.random() * 0.015,
        scale: 0.5 + Math.random() * 0.3,
      });
    }
    
    // Safety cones scattered
    for (let i = 40; i < 48; i++) {
      elements.push({
        id: i,
        type: 'cone',
        x: 5 + Math.random() * 90,
        y: 10 + Math.random() * 80,
        rotation: -5 + Math.random() * 10,
        opacity: 0.04 + Math.random() * 0.02,
        scale: 0.4 + Math.random() * 0.3,
      });
    }
    
    return elements;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base cream gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            180deg,
            hsl(42 45% 97%) 0%,
            hsl(42 42% 95%) 30%,
            hsl(40 38% 93%) 60%,
            hsl(38 35% 91%) 100%
          )`,
        }}
      />
      
      {/* Warm sunlight gradient overlay */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 60% at 50% 0%, hsl(45 60% 95% / 0.8) 0%, transparent 50%),
            radial-gradient(ellipse 80% 50% at 30% 20%, hsl(43 70% 92% / 0.4) 0%, transparent 40%),
            radial-gradient(ellipse 60% 40% at 70% 80%, hsl(40 55% 90% / 0.3) 0%, transparent 35%)
          `,
        }}
      />
      
      {/* Subtle golden atmospheric glow */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 70% 50% at 50% 40%, hsl(43 74% 49% / 0.06) 0%, transparent 60%)`,
        }}
      />
      
      {/* Road texture elements - very subtle */}
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Dash pattern */}
          <pattern id="dash" width="4" height="1" patternUnits="userSpaceOnUse">
            <rect width="2.5" height="0.6" fill="hsl(43 60% 50%)" rx="0.2" />
          </pattern>
          
          {/* Arrow shape */}
          <symbol id="arrow" viewBox="0 0 10 10">
            <path 
              d="M5 0 L10 8 L7 8 L7 10 L3 10 L3 8 L0 8 Z" 
              fill="hsl(43 55% 55%)"
            />
          </symbol>
          
          {/* Parking line */}
          <symbol id="parking-line" viewBox="0 0 2 20">
            <rect width="2" height="20" fill="hsl(0 0% 35%)" rx="0.5" />
          </symbol>
          
          {/* Safety cone */}
          <symbol id="cone" viewBox="0 0 12 16">
            <path 
              d="M6 0 L11 14 L10 16 L2 16 L1 14 Z" 
              fill="hsl(28 100% 55%)"
            />
            <rect x="0" y="14" width="12" height="2" fill="hsl(0 0% 20%)" rx="0.5" />
            <rect x="3" y="5" width="6" height="1.5" fill="hsl(0 0% 95%)" rx="0.3" />
            <rect x="2" y="9" width="8" height="1.5" fill="hsl(0 0% 95%)" rx="0.3" />
          </symbol>
        </defs>
        
        {roadElements.map((el) => {
          if (el.type === 'dash') {
            return (
              <rect
                key={el.id}
                x={el.x}
                y={el.y}
                width={8 * el.scale}
                height={0.4}
                fill="hsl(43 50% 55%)"
                opacity={el.opacity}
                rx="0.2"
                transform={`rotate(${el.rotation} ${el.x + 4 * el.scale} ${el.y + 0.2})`}
              />
            );
          }
          
          if (el.type === 'parking-line') {
            return (
              <rect
                key={el.id}
                x={el.x}
                y={el.y}
                width={0.3}
                height={12 * el.scale}
                fill="hsl(0 0% 40%)"
                opacity={el.opacity}
                rx="0.1"
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
                width={3 * el.scale}
                height={4 * el.scale}
                opacity={el.opacity}
                transform={`rotate(${el.rotation} ${el.x + 1.5 * el.scale} ${el.y + 2 * el.scale})`}
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
                width={2 * el.scale}
                height={2.8 * el.scale}
                opacity={el.opacity}
                transform={`rotate(${el.rotation} ${el.x + 1 * el.scale} ${el.y + 1.4 * el.scale})`}
              />
            );
          }
          
          return null;
        })}
      </svg>
      
      {/* Subtle grid overlay for classroom feel */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(hsl(43 50% 50% / 0.015) 1px, transparent 1px),
            linear-gradient(90deg, hsl(43 50% 50% / 0.015) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}