import { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

// Premium gold colors
const GOLD_COLORS = {
  primary: '#D4AF37',
  bright: '#FFD700',
  champagne: '#F7E7CE',
  amber: '#FFBF00',
  dark: '#B8860B',
  shimmer: '#FFF8DC',
};

export function SplashScreen({ onComplete, duration = 6000 }: SplashScreenProps) {
  const [phase, setPhase] = useState<'writing' | 'glow' | 'stars' | 'tagline' | 'hold' | 'fadeout'>('writing');
  const [letterIndex, setLetterIndex] = useState(0);
  const [showStars, setShowStars] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const starsRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    brightness: number;
    speed: number;
    twinkleOffset: number;
  }>>([]);
  const dustParticlesRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    opacity: number;
    vx: number;
    vy: number;
    life: number;
  }>>([]);

  const brandText = 'DRIVINGKLASS';

  // Initialize gold galaxy stars
  useEffect(() => {
    const stars: typeof starsRef.current = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random() * 0.7 + 0.3,
        speed: Math.random() * 0.02 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
    starsRef.current = stars;
  }, []);

  // Animate star field canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let time = 0;
    const starFieldOpacity = { value: 0 };

    const animate = () => {
      time += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Gradually increase star field opacity based on phase
      if (phase === 'glow' || phase === 'stars' || phase === 'tagline' || phase === 'hold') {
        starFieldOpacity.value = Math.min(1, starFieldOpacity.value + 0.02);
      }

      // Draw gold galaxy stars
      starsRef.current.forEach((star) => {
        const twinkle = Math.sin(time * 2 + star.twinkleOffset) * 0.3 + 0.7;
        const alpha = star.brightness * twinkle * starFieldOpacity.value;

        // Draw star glow
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.size * 4
        );
        gradient.addColorStop(0, `rgba(255, 215, 0, ${alpha})`);
        gradient.addColorStop(0.3, `rgba(212, 175, 55, ${alpha * 0.5})`);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw star core
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 248, 220, ${alpha})`;
        ctx.fill();

        // Subtle parallax movement
        star.y += star.speed;
        if (star.y > canvas.height + 10) {
          star.y = -10;
          star.x = Math.random() * canvas.width;
        }
      });

      // Draw floating chalk dust particles
      dustParticlesRef.current = dustParticlesRef.current.filter((p) => p.life > 0);
      dustParticlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy -= 0.01; // Float upward
        particle.life -= 0.01;
        particle.opacity = particle.life;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${particle.opacity * 0.6})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [phase]);

  // Add chalk dust particles when writing
  const addChalkDust = (x: number, y: number) => {
    for (let i = 0; i < 5; i++) {
      dustParticlesRef.current.push({
        x: x + Math.random() * 30 - 15,
        y: y + Math.random() * 20 - 10,
        size: Math.random() * 2 + 1,
        opacity: 1,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * -1 - 0.5,
        life: 1,
      });
    }
  };

  // Phase timing
  useEffect(() => {
    const letterInterval = setInterval(() => {
      if (letterIndex < brandText.length) {
        setLetterIndex((prev) => prev + 1);
        // Add dust particles for each letter
        const centerX = window.innerWidth / 2;
        const startX = centerX - (brandText.length * 25);
        addChalkDust(startX + letterIndex * 50, window.innerHeight / 2 - 20);
      }
    }, 150);

    // Phase transitions
    const glowTimer = setTimeout(() => setPhase('glow'), 2000);
    const starsTimer = setTimeout(() => {
      setPhase('stars');
      setShowStars(true);
    }, 2800);
    const taglineTimer = setTimeout(() => {
      setPhase('tagline');
      setShowTagline(true);
    }, 3600);
    const holdTimer = setTimeout(() => setPhase('hold'), 4500);
    const fadeTimer = setTimeout(() => {
      setPhase('fadeout');
      setFadeOut(true);
    }, duration - 800);
    const completeTimer = setTimeout(onComplete, duration);

    return () => {
      clearInterval(letterInterval);
      clearTimeout(glowTimer);
      clearTimeout(starsTimer);
      clearTimeout(taglineTimer);
      clearTimeout(holdTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [letterIndex, onComplete, duration]);

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center transition-opacity duration-700 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(180deg, #0a0a08 0%, #050504 50%, #020201 100%)',
        zIndex: 9999,
      }}
    >
      {/* Chalkboard texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.01) 2px,
              rgba(255, 255, 255, 0.01) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.01) 2px,
              rgba(255, 255, 255, 0.01) 4px
            )
          `,
          opacity: 0.5,
        }}
      />

      {/* Gold galaxy star field canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: phase !== 'writing' ? 1 : 0, transition: 'opacity 1.5s ease-in' }}
      />

      {/* Cinematic vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* Soft gold ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 45%, rgba(212, 175, 55, 0.15) 0%, transparent 60%)',
          opacity: phase === 'glow' || phase === 'stars' || phase === 'tagline' || phase === 'hold' ? 1 : 0,
        }}
      />

      {/* Main content container with cinematic push-in effect */}
      <div
        className="relative text-center transition-transform duration-[3000ms] ease-out"
        style={{
          transform: phase === 'hold' || phase === 'fadeout' ? 'scale(1.03)' : 'scale(1)',
        }}
      >
        {/* DRIVINGKLASS text with chalk writing effect */}
        <h1
          className="relative font-extrabold tracking-[0.2em] uppercase"
          style={{
            fontSize: 'clamp(2rem, 8vw, 5rem)',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {brandText.split('').map((letter, index) => (
            <span
              key={index}
              className="inline-block transition-all duration-300"
              style={{
                color: GOLD_COLORS.primary,
                opacity: index < letterIndex ? 1 : 0,
                transform: index < letterIndex ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.8)',
                textShadow: index < letterIndex && (phase === 'glow' || phase === 'stars' || phase === 'tagline' || phase === 'hold')
                  ? `
                      0 0 10px rgba(212, 175, 55, 0.9),
                      0 0 20px rgba(212, 175, 55, 0.6),
                      0 0 40px rgba(212, 175, 55, 0.4),
                      0 0 60px rgba(184, 134, 11, 0.3)
                    `
                  : '0 0 5px rgba(212, 175, 55, 0.3)',
                filter: index < letterIndex ? 'none' : 'blur(2px)',
                // Chalk texture effect
                WebkitBackgroundClip: 'text',
              }}
            >
              {letter}
            </span>
          ))}

          {/* Chalk dust trail effect */}
          <span
            className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: `${(letterIndex / brandText.length) * 100}%`,
              opacity: letterIndex < brandText.length ? 0.8 : 0,
              transition: 'opacity 0.5s ease',
            }}
          >
            {/* Chalk piece indicator */}
            <span
              className="inline-block w-2 h-4 rounded-sm"
              style={{
                background: `linear-gradient(180deg, ${GOLD_COLORS.shimmer} 0%, ${GOLD_COLORS.primary} 100%)`,
                boxShadow: `0 0 10px ${GOLD_COLORS.bright}`,
                transform: 'rotate(-15deg)',
              }}
            />
          </span>
        </h1>

        {/* Five gold stars */}
        <div
          className={`flex justify-center gap-3 mt-8 transition-all duration-1000 ${
            showStars ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className="transition-all duration-500"
              style={{
                width: 'clamp(20px, 4vw, 32px)',
                height: 'clamp(20px, 4vw, 32px)',
                fill: GOLD_COLORS.primary,
                stroke: GOLD_COLORS.bright,
                strokeWidth: 0.5,
                filter: `
                  drop-shadow(0 0 5px rgba(212, 175, 55, 0.8))
                  drop-shadow(0 0 15px rgba(212, 175, 55, 0.5))
                  drop-shadow(0 0 25px rgba(184, 134, 11, 0.3))
                `,
                transitionDelay: `${i * 100}ms`,
                opacity: showStars ? 1 : 0,
                transform: showStars ? 'scale(1)' : 'scale(0.5)',
              }}
            />
          ))}
        </div>

        {/* Tagline */}
        <p
          className={`mt-6 font-medium tracking-widest transition-all duration-1000 ${
            showTagline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{
            fontSize: 'clamp(0.875rem, 2vw, 1.25rem)',
            color: GOLD_COLORS.champagne,
            textShadow: `
              0 0 8px rgba(212, 175, 55, 0.6),
              0 0 16px rgba(212, 175, 55, 0.3)
            `,
            letterSpacing: '0.15em',
          }}
        >
          Where 5-Star Drivers Are Made
        </p>
      </div>

      {/* Floating gold dust particles overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              background: `rgba(212, 175, 55, ${Math.random() * 0.5 + 0.2})`,
              animation: `float ${10 + Math.random() * 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
              boxShadow: `0 0 ${Math.random() * 4 + 2}px rgba(212, 175, 55, 0.4)`,
            }}
          />
        ))}
      </div>

      {/* Click to skip hint */}
      <button
        onClick={onComplete}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs tracking-widest uppercase opacity-40 hover:opacity-70 transition-opacity"
        style={{ color: GOLD_COLORS.champagne }}
      >
        Click to skip
      </button>
    </div>
  );
}
