import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
}

export function GoldParticles() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const generateParticles = () => {
      const newParticles: Particle[] = [];
      for (let i = 0; i < 30; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          delay: Math.random() * 15,
          duration: 10 + Math.random() * 10,
          size: 2 + Math.random() * 4,
        });
      }
      setParticles(newParticles);
    };

    generateParticles();
  }, []);

  return (
    <div className="particles-container">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full bg-gold/40"
          style={{
            left: `${particle.x}%`,
            bottom: "-10px",
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animation: `float ${particle.duration}s linear infinite`,
            animationDelay: `${particle.delay}s`,
            boxShadow: `0 0 ${particle.size * 2}px hsl(43 74% 49% / 0.3)`,
          }}
        />
      ))}
    </div>
  );
}
