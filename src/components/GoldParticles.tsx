import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
}

export function GoldParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const generateParticles = () => {
      const newParticles: Particle[] = [];
      // More particles for richer effect
      for (let i = 0; i < 50; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          delay: Math.random() * 20,
          duration: 12 + Math.random() * 15,
          size: 1 + Math.random() * 3,
          opacity: 0.2 + Math.random() * 0.4,
        });
      }
      setParticles(newParticles);
    };

    generateParticles();
  }, []);

  return (
    <div className="particles-container pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            bottom: "-10px",
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: `hsl(43 74% 60% / ${particle.opacity})`,
            animation: `float ${particle.duration}s linear infinite`,
            animationDelay: `${particle.delay}s`,
            boxShadow: `0 0 ${particle.size * 3}px hsl(43 74% 49% / 0.4)`,
          }}
        />
      ))}
    </div>
  );
}
