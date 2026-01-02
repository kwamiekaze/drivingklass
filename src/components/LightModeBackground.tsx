import { useMemo } from "react";

interface CloudElement {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
}

interface TreeElement {
  id: number;
  x: number;
  height: number;
  width: number;
  opacity: number;
  variant: 'round' | 'tall' | 'bush';
}

interface RoadMarkingElement {
  id: number;
  x: number;
  y: number;
  width: number;
  opacity: number;
}

export function LightModeBackground() {
  // Generate soft cloud elements
  const clouds = useMemo(() => {
    const elements: CloudElement[] = [];
    for (let i = 0; i < 8; i++) {
      elements.push({
        id: i,
        x: 5 + i * 12 + Math.random() * 5,
        y: 5 + Math.random() * 20,
        width: 15 + Math.random() * 20,
        height: 6 + Math.random() * 6,
        opacity: 0.25 + Math.random() * 0.2,
      });
    }
    return elements;
  }, []);

  // Generate tree/bush silhouettes for bottom
  const trees = useMemo(() => {
    const elements: TreeElement[] = [];
    const variants: Array<'round' | 'tall' | 'bush'> = ['round', 'tall', 'bush'];
    for (let i = 0; i < 20; i++) {
      elements.push({
        id: i,
        x: -2 + i * 5.5 + Math.random() * 2,
        height: 8 + Math.random() * 12,
        width: 4 + Math.random() * 5,
        opacity: 0.08 + Math.random() * 0.06,
        variant: variants[Math.floor(Math.random() * variants.length)],
      });
    }
    return elements;
  }, []);

  // Generate road lane markings
  const roadMarkings = useMemo(() => {
    const elements: RoadMarkingElement[] = [];
    for (let i = 0; i < 12; i++) {
      elements.push({
        id: i,
        x: 5 + i * 8,
        y: 82 + Math.random() * 3,
        width: 4 + Math.random() * 2,
        opacity: 0.12 + Math.random() * 0.06,
      });
    }
    return elements;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none transition-all duration-500">
      {/* Sky gradient - bright blue to warm cream */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            180deg,
            hsl(200 70% 88%) 0%,
            hsl(200 55% 92%) 15%,
            hsl(195 40% 95%) 30%,
            hsl(45 40% 96%) 50%,
            hsl(45 35% 94%) 70%,
            hsl(38 30% 91%) 85%,
            hsl(35 25% 88%) 100%
          )`,
        }}
      />

      {/* Warm sunlight glow from top */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 50% at 50% -10%, hsl(45 80% 92% / 0.95) 0%, transparent 45%),
            radial-gradient(ellipse 80% 40% at 70% 5%, hsl(40 75% 88% / 0.6) 0%, transparent 35%)
          `,
        }}
      />

      {/* Clouds layer */}
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="cloud-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" />
          </filter>
        </defs>
        
        {/* Soft white clouds */}
        {clouds.map((cloud) => (
          <ellipse
            key={cloud.id}
            cx={cloud.x + cloud.width / 2}
            cy={cloud.y}
            rx={cloud.width / 2}
            ry={cloud.height / 2}
            fill="white"
            opacity={cloud.opacity}
            filter="url(#cloud-blur)"
          />
        ))}
      </svg>

      {/* Greenery silhouettes at bottom */}
      <svg 
        className="absolute bottom-0 left-0 w-full h-[30%]"
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="tree-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.3" />
          </filter>
        </defs>
        
        {trees.map((tree) => {
          if (tree.variant === 'round') {
            return (
              <ellipse
                key={tree.id}
                cx={tree.x + tree.width / 2}
                cy={30 - tree.height / 2}
                rx={tree.width / 2}
                ry={tree.height / 2}
                fill="hsl(120 25% 55%)"
                opacity={tree.opacity}
                filter="url(#tree-blur)"
              />
            );
          }
          if (tree.variant === 'tall') {
            return (
              <path
                key={tree.id}
                d={`M${tree.x + tree.width / 2} ${30 - tree.height} 
                    L${tree.x + tree.width} ${30} 
                    L${tree.x} ${30} Z`}
                fill="hsl(130 20% 50%)"
                opacity={tree.opacity}
                filter="url(#tree-blur)"
              />
            );
          }
          // bush
          return (
            <ellipse
              key={tree.id}
              cx={tree.x + tree.width / 2}
              cy={30 - tree.height / 3}
              rx={tree.width / 1.5}
              ry={tree.height / 3}
              fill="hsl(115 30% 60%)"
              opacity={tree.opacity}
              filter="url(#tree-blur)"
            />
          );
        })}
      </svg>

      {/* Subtle road/asphalt area at very bottom */}
      <div
        className="absolute inset-x-0 bottom-0 h-[12%]"
        style={{
          background: `linear-gradient(
            180deg, 
            transparent 0%,
            hsl(220 8% 75% / 0.15) 30%,
            hsl(220 8% 65% / 0.25) 70%,
            hsl(220 8% 55% / 0.35) 100%
          )`,
        }}
      />

      {/* Road lane markings */}
      <svg 
        className="absolute bottom-0 left-0 w-full h-[15%]"
        viewBox="0 0 100 15"
        preserveAspectRatio="none"
      >
        {roadMarkings.map((marking) => (
          <rect
            key={marking.id}
            x={marking.x}
            y={marking.y - 80}
            width={marking.width}
            height={0.8}
            rx={0.4}
            fill="hsl(45 60% 70%)"
            opacity={marking.opacity}
          />
        ))}
      </svg>

      {/* Soft ambient golden glow in center (for car area) */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, hsl(43 70% 75% / 0.15) 0%, transparent 50%)`,
        }}
      />

      {/* Very subtle warm vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, hsl(38 30% 80% / 0.15) 100%)
          `,
        }}
      />
    </div>
  );
}