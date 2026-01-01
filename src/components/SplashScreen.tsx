import { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import goldCarSplash from '@/assets/gold-car-splash.png';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

// Premium gold colors matching the car reference
const GOLD_COLORS = {
  primary: '#C9A227',      // Champagne gold (car body)
  bright: '#D4AF37',       // Metallic gold
  shimmer: '#E8D5A3',      // Light gold shimmer
  amber: '#B8860B',        // Dark gold
  champagne: '#F5E6C8',    // Cream gold
  highlight: '#FFE4B5',    // Soft highlight
  headlight: '#FFF8E7',    // Warm white headlight
};

export function SplashScreen({ onComplete, duration = 7000 }: SplashScreenProps) {
  const [phase, setPhase] = useState<'intro' | 'car' | 'title' | 'slogan' | 'stars' | 'hold' | 'fadeout'>('intro');
  const [showCar, setShowCar] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showSlogan, setShowSlogan] = useState(false);
  const [showStars, setShowStars] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [headlightPulse, setHeadlightPulse] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const starsRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    brightness: number;
    speed: number;
    twinkleOffset: number;
    depth: number;
  }>>([]);

  // Initialize gold galaxy stars with depth layers
  useEffect(() => {
    const stars: typeof starsRef.current = [];
    for (let i = 0; i < 250; i++) {
      const depth = Math.random();
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: depth * 2 + 0.3,
        brightness: depth * 0.6 + 0.2,
        speed: (1 - depth) * 0.03 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
        depth,
      });
    }
    starsRef.current = stars;
  }, []);

  // Headlight pulse animation
  useEffect(() => {
    const pulseInterval = setInterval(() => {
      setHeadlightPulse(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(pulseInterval);
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
    let starFieldOpacity = 0;

    const animate = () => {
      time += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Gradually increase star field opacity
      if (phase !== 'intro') {
        starFieldOpacity = Math.min(1, starFieldOpacity + 0.015);
      }

      // Draw gold galaxy stars with parallax
      starsRef.current.forEach((star) => {
        const twinkle = Math.sin(time * 1.5 + star.twinkleOffset) * 0.4 + 0.6;
        const alpha = star.brightness * twinkle * starFieldOpacity;

        // Outer glow (gold nebula effect)
        const outerGlow = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.size * 6
        );
        outerGlow.addColorStop(0, `rgba(201, 162, 39, ${alpha * 0.8})`);
        outerGlow.addColorStop(0.4, `rgba(212, 175, 55, ${alpha * 0.3})`);
        outerGlow.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 6, 0, Math.PI * 2);
        ctx.fillStyle = outerGlow;
        ctx.fill();

        // Star core
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 230, 200, ${alpha})`;
        ctx.fill();

        // Parallax movement
        star.y += star.speed * (1 - star.depth * 0.5);
        star.x += star.speed * 0.1 * (star.x > canvas.width / 2 ? 1 : -1);
        
        if (star.y > canvas.height + 10) {
          star.y = -10;
          star.x = Math.random() * canvas.width;
        }
      });

      // Floating gold particles
      for (let i = 0; i < 30; i++) {
        const px = (Math.sin(time * 0.3 + i * 0.5) * 0.5 + 0.5) * canvas.width;
        const py = (Math.cos(time * 0.2 + i * 0.7) * 0.5 + 0.5) * canvas.height;
        const pAlpha = (Math.sin(time + i) * 0.3 + 0.4) * starFieldOpacity;
        
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(201, 162, 39, ${pAlpha})`;
        ctx.fill();
      }

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

  // Phase timing
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => { setPhase('car'); setShowCar(true); }, 500));
    timers.push(setTimeout(() => { setPhase('title'); setShowTitle(true); }, 1500));
    timers.push(setTimeout(() => { setPhase('slogan'); setShowSlogan(true); }, 2800));
    timers.push(setTimeout(() => { setPhase('stars'); setShowStars(true); }, 3800));
    timers.push(setTimeout(() => setPhase('hold'), 5000));
    timers.push(setTimeout(() => { setPhase('fadeout'); setFadeOut(true); }, duration - 800));
    timers.push(setTimeout(onComplete, duration));

    return () => timers.forEach(clearTimeout);
  }, [onComplete, duration]);

  // Calculate headlight glow intensity (smooth sine wave pulse)
  const headlightIntensity = Math.sin(headlightPulse * 0.06) * 0.3 + 0.7;

  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(180deg, #080808 0%, #040404 50%, #000000 100%)',
        zIndex: 9999,
      }}
    >
      {/* Gold galaxy star field canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Cinematic vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.9) 100%)',
        }}
      />

      {/* Soft gold ambient glow behind car */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1500"
        style={{
          background: `radial-gradient(ellipse 50% 35% at 50% 55%, rgba(201, 162, 39, ${showCar ? 0.15 : 0}) 0%, transparent 70%)`,
        }}
      />

      {/* Main content container with cinematic push-in */}
      <div
        className="relative flex flex-col items-center transition-transform duration-[4000ms] ease-out"
        style={{
          transform: phase === 'hold' || phase === 'fadeout' ? 'scale(1.04)' : 'scale(1)',
        }}
      >
        {/* DRIVING KLASS Title */}
        <h1
          className={`relative font-light tracking-[0.25em] uppercase text-center transition-all duration-1000 ${
            showTitle ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6'
          }`}
          style={{
            fontSize: 'clamp(1.5rem, 6vw, 3.5rem)',
            fontFamily: '"Playfair Display", "Times New Roman", serif',
            letterSpacing: '0.3em',
            marginBottom: 'clamp(1rem, 3vw, 2rem)',
          }}
        >
          <span
            style={{
              background: `linear-gradient(180deg, ${GOLD_COLORS.shimmer} 0%, ${GOLD_COLORS.primary} 40%, ${GOLD_COLORS.amber} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: showTitle ? `drop-shadow(0 0 20px rgba(201, 162, 39, 0.6)) drop-shadow(0 0 40px rgba(201, 162, 39, 0.3))` : 'none',
            }}
          >
            DRIVING KLASS
          </span>
        </h1>

        {/* Gold Car with Headlight Animation */}
        <div
          className={`relative transition-all duration-1200 ease-out ${
            showCar ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'
          }`}
          style={{
            width: 'clamp(280px, 60vw, 500px)',
            marginBottom: 'clamp(1rem, 2vw, 1.5rem)',
          }}
        >
          {/* Car rim light glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(201, 162, 39, 0.2) 0%, transparent 60%)`,
              filter: 'blur(20px)',
              transform: 'scale(1.2)',
            }}
          />
          
          {/* Headlight glow overlay (left) */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: '12%',
              top: '35%',
              width: '60px',
              height: '25px',
              background: `radial-gradient(ellipse at center, rgba(255, 248, 231, ${headlightIntensity * 0.9}) 0%, rgba(201, 162, 39, ${headlightIntensity * 0.4}) 40%, transparent 70%)`,
              filter: `blur(8px)`,
              opacity: showCar ? 1 : 0,
              transition: 'opacity 1s ease',
            }}
          />
          
          {/* Headlight glow overlay (right) */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: '35%',
              top: '40%',
              width: '50px',
              height: '20px',
              background: `radial-gradient(ellipse at center, rgba(255, 248, 231, ${headlightIntensity * 0.7}) 0%, rgba(201, 162, 39, ${headlightIntensity * 0.3}) 40%, transparent 70%)`,
              filter: `blur(6px)`,
              opacity: showCar ? 1 : 0,
              transition: 'opacity 1s ease',
            }}
          />

          {/* The actual car image */}
          <img
            src={goldCarSplash}
            alt="DrivingKlass Gold Sedan"
            className="w-full h-auto relative z-10"
            style={{
              filter: `drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 60px rgba(201, 162, 39, 0.2))`,
            }}
          />
          
          {/* Subtle ground reflection */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-4 pointer-events-none"
            style={{
              background: `linear-gradient(180deg, rgba(201, 162, 39, 0.15) 0%, transparent 100%)`,
              filter: 'blur(10px)',
              transform: 'translateX(-50%) scaleY(-0.3)',
            }}
          />
        </div>

        {/* Slogan */}
        <p
          className={`text-center font-light tracking-widest transition-all duration-1000 ${
            showSlogan ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{
            fontSize: 'clamp(0.75rem, 2vw, 1.1rem)',
            letterSpacing: '0.2em',
            marginBottom: 'clamp(0.75rem, 2vw, 1.5rem)',
            color: GOLD_COLORS.champagne,
            textShadow: `0 0 15px rgba(201, 162, 39, 0.5), 0 0 30px rgba(201, 162, 39, 0.3)`,
          }}
        >
          Where 5-Star Drivers Are Made
        </p>

        {/* Five Gold Stars with individual twinkle */}
        <div
          className={`flex justify-center gap-2 sm:gap-3 transition-all duration-1000 ${
            showStars ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {[...Array(5)].map((_, i) => (
            <div key={i} className="relative">
              {/* Star sparkle/glint effect */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  animation: showStars ? `starSparkle ${2 + i * 0.3}s ease-in-out infinite` : 'none',
                  animationDelay: `${i * 0.5}s`,
                }}
              >
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-3 rounded-full"
                  style={{
                    background: `linear-gradient(180deg, ${GOLD_COLORS.shimmer} 0%, transparent 100%)`,
                    opacity: 0.8,
                  }}
                />
              </div>
              
              <Star
                className="transition-all duration-500"
                style={{
                  width: 'clamp(18px, 4vw, 28px)',
                  height: 'clamp(18px, 4vw, 28px)',
                  fill: `url(#starGradient)`,
                  stroke: GOLD_COLORS.shimmer,
                  strokeWidth: 0.3,
                  filter: `
                    drop-shadow(0 0 4px rgba(201, 162, 39, 0.9))
                    drop-shadow(0 0 12px rgba(201, 162, 39, 0.6))
                    drop-shadow(0 0 20px rgba(184, 134, 11, 0.4))
                  `,
                  transitionDelay: `${i * 120}ms`,
                  opacity: showStars ? 1 : 0,
                  transform: showStars ? 'scale(1)' : 'scale(0.3)',
                }}
              />
            </div>
          ))}
        </div>

        {/* SVG gradient for stars */}
        <svg width="0" height="0" className="absolute">
          <defs>
            <linearGradient id="starGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={GOLD_COLORS.shimmer} />
              <stop offset="40%" stopColor={GOLD_COLORS.primary} />
              <stop offset="100%" stopColor={GOLD_COLORS.amber} />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Click to skip */}
      <button
        onClick={onComplete}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs tracking-[0.2em] uppercase opacity-30 hover:opacity-60 transition-opacity"
        style={{ color: GOLD_COLORS.champagne }}
      >
        Click to skip
      </button>

      {/* Keyframe animations */}
      <style>{`
        @keyframes starSparkle {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
