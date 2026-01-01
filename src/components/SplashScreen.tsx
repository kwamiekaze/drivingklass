import { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import goldCarSplash from '@/assets/gold-car-splash.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

// Premium champagne gold colors matching the car
const GOLD = {
  metallic: '#C9A227',
  champagne: '#D4AF37',
  shimmer: '#E8D5A3',
  dark: '#8B7355',
  cream: '#F5E6C8',
  headlight: '#FFF8E7',
};

export function SplashScreen({ onComplete, duration = 7000 }: SplashScreenProps) {
  const [phase, setPhase] = useState<'init' | 'car' | 'title' | 'slogan' | 'stars' | 'hold' | 'fade'>('init');
  const [headlightPhase, setHeadlightPhase] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const starsRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    brightness: number;
    speed: number;
    twinklePhase: number;
  }>>([]);

  const showCar = phase !== 'init';
  const showTitle = ['title', 'slogan', 'stars', 'hold', 'fade'].includes(phase);
  const showSlogan = ['slogan', 'stars', 'hold', 'fade'].includes(phase);
  const showStars = ['stars', 'hold', 'fade'].includes(phase);
  const isFading = phase === 'fade';

  // Initialize distant gold stars (subtle, not glowy)
  useEffect(() => {
    const stars: typeof starsRef.current = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 1.2 + 0.3,
        brightness: Math.random() * 0.4 + 0.1,
        speed: Math.random() * 0.008 + 0.002,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
    starsRef.current = stars;
  }, []);

  // Headlight slow pulse (luxury cadence)
  useEffect(() => {
    const interval = setInterval(() => {
      setHeadlightPhase(p => (p + 1) % 200);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  // Canvas animation for subtle gold stars
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    let opacity = 0;

    const draw = () => {
      time += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (phase !== 'init') {
        opacity = Math.min(1, opacity + 0.01);
      }

      // Draw subtle distant stars (no glow clouds)
      starsRef.current.forEach(star => {
        const twinkle = Math.sin(time * 0.8 + star.twinklePhase) * 0.3 + 0.7;
        const alpha = star.brightness * twinkle * opacity;

        // Simple dot star (no bloom)
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 162, 39, ${alpha})`;
        ctx.fill();

        // Very subtle tiny glow (realistic star point)
        if (star.size > 0.8) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(201, 162, 39, ${alpha * 0.15})`;
          ctx.fill();
        }

        // Parallax drift
        star.y += star.speed;
        if (star.y > canvas.height + 5) {
          star.y = -5;
          star.x = Math.random() * canvas.width;
        }
      });

      animationRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase]);

  // Phase timing
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('car'), 400),
      setTimeout(() => setPhase('title'), 1400),
      setTimeout(() => setPhase('slogan'), 2600),
      setTimeout(() => setPhase('stars'), 3600),
      setTimeout(() => setPhase('hold'), 4800),
      setTimeout(() => setPhase('fade'), duration - 700),
      setTimeout(onComplete, duration),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete, duration]);

  // Headlight intensity (slow sine wave for luxury pulse)
  const headlightIntensity = Math.sin(headlightPhase * 0.03) * 0.25 + 0.75;

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: '#000000', zIndex: 9999 }}
    >
      {/* Subtle gold star field */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Subtle vignette (cinematic) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Main content with slow cinematic push-in */}
      <div
        className="relative flex flex-col items-center transition-transform ease-out"
        style={{
          transitionDuration: '5000ms',
          transform: showStars ? 'scale(1.03)' : 'scale(1)',
        }}
      >
        {/* DRIVING KLASS Title */}
        <h1
          className={`relative tracking-[0.25em] uppercase text-center transition-all duration-1000 ease-out ${
            showTitle ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}
          style={{
            fontSize: 'clamp(1.4rem, 5vw, 3rem)',
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 400,
            letterSpacing: '0.35em',
            marginBottom: 'clamp(1.5rem, 4vw, 3rem)',
          }}
        >
          <span
            style={{
              background: `linear-gradient(180deg, ${GOLD.shimmer} 0%, ${GOLD.metallic} 50%, ${GOLD.dark} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            DRIVING KLASS
          </span>
        </h1>

        {/* Car container */}
        <div
          className={`relative transition-all duration-1200 ease-out ${
            showCar ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ width: 'clamp(260px, 55vw, 480px)' }}
        >
          {/* Headlight glow - left (subtle, warm) */}
          <div
            className="absolute pointer-events-none z-20"
            style={{
              left: '10%',
              top: '32%',
              width: '40px',
              height: '15px',
              background: `radial-gradient(ellipse at center, rgba(255, 248, 231, ${headlightIntensity * 0.6}) 0%, transparent 70%)`,
              filter: 'blur(4px)',
              opacity: showCar ? 1 : 0,
              transition: 'opacity 0.8s',
            }}
          />

          {/* Headlight glow - right (subtle) */}
          <div
            className="absolute pointer-events-none z-20"
            style={{
              left: '32%',
              top: '38%',
              width: '30px',
              height: '12px',
              background: `radial-gradient(ellipse at center, rgba(255, 248, 231, ${headlightIntensity * 0.45}) 0%, transparent 70%)`,
              filter: 'blur(3px)',
              opacity: showCar ? 1 : 0,
              transition: 'opacity 0.8s',
            }}
          />

          {/* The car - no glow aura, just shadow for grounding */}
          <img
            src={goldCarSplash}
            alt="DrivingKlass Gold Sedan"
            className="w-full h-auto relative z-10"
            style={{
              filter: 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.6))',
            }}
          />

          {/* Floor reflection (realistic, low opacity, blurred) */}
          <div
            className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[90%] overflow-hidden pointer-events-none"
            style={{ height: '60px' }}
          >
            <img
              src={goldCarSplash}
              alt=""
              className="w-full h-auto"
              style={{
                transform: 'scaleY(-0.35) translateY(-140%)',
                opacity: 0.12,
                filter: 'blur(3px)',
                maskImage: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)',
              }}
            />
          </div>

          {/* Subtle rim light effect on edges (CSS only, no glow blobs) */}
          <div
            className="absolute inset-0 pointer-events-none z-5"
            style={{
              background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.08) 0%, transparent 30%, transparent 70%, rgba(201, 162, 39, 0.05) 100%)',
              mixBlendMode: 'overlay',
            }}
          />
        </div>

        {/* Slogan */}
        <p
          className={`text-center tracking-[0.15em] transition-all duration-1000 ease-out ${
            showSlogan ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
          style={{
            fontSize: 'clamp(0.7rem, 1.8vw, 1rem)',
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 300,
            color: GOLD.cream,
            marginTop: 'clamp(1rem, 3vw, 2rem)',
            marginBottom: 'clamp(0.75rem, 2vw, 1.25rem)',
          }}
        >
          Where 5-Star Drivers Are Made
        </p>

        {/* Five metallic gold stars (no outward glow, natural shine) */}
        <div
          className={`flex justify-center gap-2 transition-all duration-800 ${
            showStars ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              style={{
                width: 'clamp(16px, 3.5vw, 24px)',
                height: 'clamp(16px, 3.5vw, 24px)',
                fill: `url(#starGold)`,
                stroke: GOLD.shimmer,
                strokeWidth: 0.4,
                transitionDelay: `${i * 100}ms`,
                opacity: showStars ? 1 : 0,
                transform: showStars ? 'scale(1)' : 'scale(0.5)',
                transition: 'all 0.5s ease-out',
              }}
            />
          ))}
        </div>

        {/* SVG gradient for stars */}
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="starGold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={GOLD.shimmer} />
              <stop offset="50%" stopColor={GOLD.metallic} />
              <stop offset="100%" stopColor={GOLD.dark} />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Skip button */}
      <button
        onClick={onComplete}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs tracking-[0.15em] uppercase opacity-25 hover:opacity-50 transition-opacity"
        style={{ color: GOLD.cream }}
      >
        Skip
      </button>
    </div>
  );
}
