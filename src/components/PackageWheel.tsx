import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { PackageButton } from "./PackageButton";
import { PackageModal } from "./PackageModal";
import { cn } from "@/lib/utils";
import { getPackagesSortedByPosition, getPackageById } from "@/data/packages";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "./ThemeProvider";
import { useAnalytics } from "@/hooks/useAnalytics";
import { formatChipPrice } from "@/lib/priceFormatters";
import { supabase } from "@/integrations/supabase/client";
import carHeadlightsOff from "@/assets/car-headlights-off.png";
import carHeadlightsOn from "@/assets/car-headlights-on.png";

// Clickable car center - routes to auth or dashboard based on login state/role
function CarCenterLink({ children }: { children: React.ReactNode }) {
  const [destination, setDestination] = useState("/auth");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setDestination("/auth");
        return;
      }
      // Fetch role from user_roles
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();
      
      const role = roleData?.role;
      if (role === 'admin' || role === 'staff') {
        setDestination("/admin");
      } else if (role === 'instructor') {
        setDestination("/instructor");
      } else {
        setDestination("/student");
      }
    };
    checkAuth();
  }, []);

  return (
    <Link
      to={destination}
      className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
      aria-label={destination === "/auth" ? "Sign in" : "Go to dashboard"}
    >
      {children}
    </Link>
  );
}
interface PackageWheelProps {
  onPackageSelect?: (packageId: string) => void;
  splashComplete?: boolean;
}

// Price chip component - positioned inside the circle between button and car
function PriceChip({ 
  price, 
  angle, 
  containerSize,
  isLight,
  isAnimating = false,
}: { 
  price: string; 
  angle: number; 
  containerSize: number;
  isLight: boolean;
  isAnimating?: boolean;
}) {
  // Calculate position inside the ring (toward the car)
  const isMobile = containerSize < 400;
  const labelRadiusOffset = isMobile ? 65 : 85;
  
  // Button radius is 50% of container, chip is closer to center
  const buttonRadiusPx = containerSize * 0.5;
  const labelRadiusPx = buttonRadiusPx - labelRadiusOffset;
  const labelRadiusPercent = (labelRadiusPx / containerSize) * 100;
  
  const angleRad = angle * (Math.PI / 180);
  const x = Math.cos(angleRad) * labelRadiusPercent;
  const y = Math.sin(angleRad) * labelRadiusPercent;

  // Format price for chip display (removes .00)
  const chipPrice = formatChipPrice(price);

  return (
    <div 
      className={cn(
        "absolute z-20 pointer-events-none",
        isAnimating ? "animate-fade-in" : "animate-scale-in"
      )}
      style={{
        left: `calc(50% + ${x}%)`,
        top: `calc(50% + ${y}%)`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Small caret/line pointing toward the button */}
      <div 
        className="absolute w-3 h-[2px] opacity-60"
        style={{
          background: 'linear-gradient(90deg, transparent, hsl(43 70% 50%))',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
          transformOrigin: 'center',
        }}
      />
      
      {/* Price pill/badge - theme aware */}
      <span 
        className={cn(
          "relative block px-2 py-1 rounded-md font-bold whitespace-nowrap",
          "text-[10px] sm:text-xs md:text-sm",
          "backdrop-blur-sm"
        )}
        style={isLight ? {
          background: 'linear-gradient(135deg, hsl(42 45% 97%) 0%, hsl(40 40% 94%) 100%)',
          border: '2px solid hsl(43 74% 49% / 0.6)',
          color: '#1a1a1a',
          boxShadow: '0 2px 12px hsl(0 0% 0% / 0.12), 0 0 15px hsl(43 74% 49% / 0.15)',
          maxWidth: isMobile ? '55px' : '80px',
          textAlign: 'center',
        } : {
          background: 'linear-gradient(135deg, hsl(30 12% 10% / 0.92) 0%, hsl(25 10% 6% / 0.95) 100%)',
          border: '1px solid hsl(43 65% 45% / 0.6)',
          color: 'hsl(43 90% 62%)',
          boxShadow: '0 2px 12px hsl(0 0% 0% / 0.5), 0 0 18px hsl(43 80% 52% / 0.18), inset 0 1px 0 hsl(43 50% 50% / 0.15)',
          textShadow: '0 0 8px hsl(43 80% 52% / 0.4)',
          maxWidth: isMobile ? '55px' : '80px',
          textAlign: 'center',
        }}
      >
        {chipPrice}
      </span>
    </div>
  );
}

export function PackageWheel({ onPackageSelect, splashComplete = true }: PackageWheelProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hasUserSelected, setHasUserSelected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [headlightsOn, setHeadlightsOn] = useState(false);
  const flickerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isLight = resolvedTheme === "light";
  const [containerSize, setContainerSize] = useState(320);
  const { trackClick } = useAnalytics();
  
  const isMobile = useIsMobile();
  
  // Check for reduced motion preference
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const packages = useMemo(() => getPackagesSortedByPosition(), []);
  
  // Cleanup flicker timeouts on unmount
  useEffect(() => {
    return () => {
      if (flickerTimeoutRef.current) {
        clearTimeout(flickerTimeoutRef.current);
      }
    };
  }, []);
  
  // Trigger headlight flicker animation - DARK THEME ONLY
  const triggerFlicker = useCallback(() => {
    // Light theme: never turn on headlights
    if (!isDark) {
      setHeadlightsOn(false);
      return;
    }
    
    // Clear any existing flicker
    if (flickerTimeoutRef.current) {
      clearTimeout(flickerTimeoutRef.current);
    }
    
    // If user prefers reduced motion, just turn on without flicker
    if (prefersReducedMotion) {
      setHeadlightsOn(true);
      return;
    }
    
    // Dark theme: flicker sequence on -> off -> on
    setHeadlightsOn(true);
    flickerTimeoutRef.current = setTimeout(() => {
      setHeadlightsOn(false);
      flickerTimeoutRef.current = setTimeout(() => {
        setHeadlightsOn(true);
      }, 90);
    }, 90);
  }, [prefersReducedMotion, isDark]);
  
  const totalButtons = packages.length;

  // Determine which price chip to show
  // Priority: 1) Desktop hover, 2) Selected, 3) Mobile glow animation
  const chipIndexToShow = useMemo(() => {
    // On desktop, hover takes priority
    if (!isMobile && hoveredIndex !== null) {
      return { index: hoveredIndex, isAnimating: false, type: 'hover' };
    }
    // After user selection, show selected package chip
    if (hasUserSelected && selectedPackageId) {
      const idx = packages.findIndex(p => p.id === selectedPackageId);
      if (idx >= 0) {
        return { index: idx, isAnimating: false, type: 'selected' };
      }
    }
    // Mobile glow animation (before selection)
    if (isMobile && !hasUserSelected && highlightedIndex !== null) {
      return { index: highlightedIndex, isAnimating: true, type: 'glow' };
    }
    return null;
  }, [isMobile, hoveredIndex, hasUserSelected, selectedPackageId, highlightedIndex, packages]);

  // Detect container size for responsive positioning
  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width >= 1024) setContainerSize(600);
      else if (width >= 768) setContainerSize(500);
      else if (width >= 640) setContainerSize(400);
      else setContainerSize(320);
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Auto-orbit animation - runs ONLY on mobile (<768px), before user selection, and AFTER splash is complete
  useEffect(() => {
    // Only run on mobile
    if (!isMobile) {
      setHighlightedIndex(null);
      return;
    }
    
    // Don't run if user has already selected
    if (hasUserSelected) {
      setHighlightedIndex(null);
      return;
    }
    
    // Wait for splash to complete before starting animation
    if (!splashComplete) {
      setHighlightedIndex(null);
      return;
    }

    setHighlightedIndex(0);
    // Animation runs at 1800ms (50% slower than original 900ms)
    const intervalId = setInterval(() => {
      setHighlightedIndex((prev) => ((prev ?? 0) + 1) % totalButtons);
    }, 1800);

    return () => clearInterval(intervalId);
  }, [isMobile, hasUserSelected, totalButtons, splashComplete]);

  // Handle package click - also opens modal on double-tap of same package
  const handlePackageClick = useCallback((packageId: string) => {
    trackClick("package_select", { package_id: packageId });
    if (selectedPackageId === packageId) {
      // Second tap on the same package opens the modal
      setIsModalOpen(true);
    } else {
      setSelectedPackageId(packageId);
      setHasUserSelected(true);
      onPackageSelect?.(packageId);
      // Trigger headlight flicker on new selection
      triggerFlicker();
    }
  }, [selectedPackageId, onPackageSelect, trackClick, triggerFlicker]);

  const handleInfoClick = () => {
    if (selectedPackageId) {
      trackClick("open_info", { package_id: selectedPackageId });
      setIsModalOpen(true);
    }
  };

  // Calculate button positions in a circle
  // Starting from top (12 o'clock position) and going clockwise
  const buttonPositions = useMemo(() => {
    const positions: { x: number; y: number; angle: number }[] = [];
    
    for (let i = 0; i < totalButtons; i++) {
      // Start at -90 degrees (12 o'clock) so first package is at top
      const angleDegrees = (i / totalButtons) * 360 - 90;
      const angle = angleDegrees * (Math.PI / 180);
      
      positions.push({
        x: Math.cos(angle) * 50, // 50% from center
        y: Math.sin(angle) * 50,
        angle: angleDegrees,
      });
    }
    return positions;
  }, [totalButtons]);

  const selectedPackage = selectedPackageId ? getPackageById(selectedPackageId) : null;
  const selectedIndex = selectedPackageId 
    ? packages.findIndex(p => p.id === selectedPackageId) 
    : -1;

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Package wheel container - overflow visible for internal elements */}
      <div 
        className="relative overflow-visible"
        style={{
          width: containerSize,
          height: containerSize,
        }}
      >
        
        {/* HERO CENTER LAYER - Car with headlight switching - CLICKABLE */}
        <CarCenterLink>
          <div className="relative w-[58%] flex items-center justify-center">
            {/* Static radial glow behind car - never changes */}
            <div 
              className="absolute inset-0 flex items-center justify-center"
              style={{
                background: 'radial-gradient(ellipse 80% 60% at center, hsl(43 60% 40% / 0.15) 0%, hsl(40 50% 35% / 0.08) 35%, transparent 70%)',
                filter: 'blur(20px)',
                transform: 'scale(1.3)',
                pointerEvents: 'none',
              }}
            />
            
            {/* Static cinematic shadow/reflection under car */}
            <div 
              className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[90%] h-10"
              style={{
                background: 'radial-gradient(ellipse at center, hsl(0 0% 0% / 0.65) 0%, hsl(0 0% 0% / 0.35) 45%, transparent 75%)',
                filter: 'blur(14px)',
                pointerEvents: 'none',
              }}
            />
            
            {/* Car images container - crossfade between off and on */}
            <div className="relative w-full h-auto">
              {/* Headlights OFF image */}
              <img 
                src={carHeadlightsOff} 
                alt="DrivingKlass sports car" 
                className="w-full h-auto object-contain relative z-10 transition-opacity duration-150"
                style={{
                  filter: 'contrast(1.08) saturate(1.05)',
                  pointerEvents: 'none',
                  opacity: headlightsOn ? 0 : 1,
                }}
              />
              {/* Headlights ON image - overlaid */}
              <img 
                src={carHeadlightsOn} 
                alt="DrivingKlass sports car illuminated" 
                className="absolute inset-0 w-full h-auto object-contain z-10 transition-opacity duration-150"
                style={{
                  filter: 'contrast(1.08) saturate(1.05)',
                  pointerEvents: 'none',
                  opacity: headlightsOn ? 1 : 0,
                }}
              />
            </div>
          </div>
        </CarCenterLink>

        {/* Price chip layer - shows during glow animation, hover (desktop), or selection */}
        {chipIndexToShow && (
          <PriceChip
            key={`chip-${chipIndexToShow.type}-${chipIndexToShow.index}`}
            price={packages[chipIndexToShow.index].price}
            angle={buttonPositions[chipIndexToShow.index].angle}
            containerSize={containerSize}
            isLight={isLight}
            isAnimating={chipIndexToShow.isAnimating}
          />
        )}

        {/* Package buttons positioned in circle - topmost layer */}
        {packages.map((pkg, index) => {
          const pos = buttonPositions[index];
          // Only show highlight animation on mobile before user selection
          const isHighlighted = isMobile && !hasUserSelected && highlightedIndex === index;
          const isSelected = selectedPackageId === pkg.id;
          
          return (
            <PackageButton
              key={pkg.id}
              label={pkg.label}
              isSelected={isSelected}
              isHighlighted={isHighlighted}
              onClick={() => handlePackageClick(pkg.id)}
              onMouseEnter={() => !isMobile && setHoveredIndex(index)}
              onMouseLeave={() => !isMobile && setHoveredIndex(null)}
              style={{
                left: `calc(50% + ${pos.x}%)`,
                top: `calc(50% + ${pos.y}%)`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          );
        })}
      </div>

      {/* Selected package indicator & INFO CTA - moved down with more spacing */}
      <div className="mt-12 sm:mt-16 md:mt-20 text-center pb-6">
        <div className={cn(
          "transition-all duration-300",
          selectedPackageId ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}>
          <p 
            className="text-sm mb-2"
            style={isLight ? { 
              color: '#1C1C1C',
              textShadow: '0 0 1px rgba(212,175,55,0.9), 0 0 6px rgba(212,175,55,0.35)',
            } : { 
              color: 'hsl(42 30% 65%)' 
            }}
          >
            Selected Package
          </p>
          <p 
            className="text-lg sm:text-xl font-bold mb-1"
            style={isLight ? {
              color: 'rgba(20, 20, 20, 0.92)',
              fontWeight: 700,
              textShadow: '0 1px 0 rgba(0,0,0,0.12), 0 0 6px rgba(212, 175, 55, 0.55), 0 0 14px rgba(212, 175, 55, 0.35), 0 0 22px rgba(212, 175, 55, 0.18)',
            } : {
              background: 'linear-gradient(135deg, hsl(43 85% 55%) 0%, hsl(48 90% 72%) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 6px hsl(43 80% 52% / 0.35))',
            }}
          >
            {selectedPackage?.label.replace('\n', ' ')}
          </p>
          <p 
            className="text-2xl sm:text-3xl font-bold mb-5"
            style={isLight ? {
              color: 'rgba(20, 20, 20, 0.92)',
              fontWeight: 700,
              textShadow: '0 1px 0 rgba(0,0,0,0.12), 0 0 6px rgba(212, 175, 55, 0.55), 0 0 14px rgba(212, 175, 55, 0.35), 0 0 22px rgba(212, 175, 55, 0.18)',
            } : {
              background: 'linear-gradient(135deg, hsl(38 75% 45%) 0%, hsl(43 85% 55%) 50%, hsl(48 90% 72%) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 10px hsl(43 80% 52% / 0.3))',
            }}
          >
            {selectedPackage?.price}
          </p>
        </div>
        
        <button
          onClick={handleInfoClick}
          disabled={!selectedPackageId}
          className={cn(
            "px-10 py-4 rounded-full font-bold tracking-wider uppercase text-sm",
            "transition-all duration-200",
            selectedPackageId 
              ? "hover:scale-[0.98] active:scale-[0.96] cursor-pointer" 
              : "opacity-50 cursor-not-allowed"
          )}
          style={{
            background: selectedPackageId
              ? 'linear-gradient(145deg, hsl(36 75% 35%) 0%, hsl(43 80% 52%) 50%, hsl(48 75% 60%) 100%)'
              : 'linear-gradient(145deg, hsl(36 30% 25%) 0%, hsl(43 35% 35%) 50%, hsl(48 30% 40%) 100%)',
            color: selectedPackageId ? 'hsl(30 10% 8%)' : 'hsl(30 10% 25%)',
            boxShadow: selectedPackageId 
              ? '0 4px 25px hsl(43 80% 52% / 0.35), 0 0 40px hsl(43 80% 52% / 0.15), inset 0 1px 0 hsl(48 80% 70% / 0.4)'
              : '0 2px 10px hsl(0 0% 0% / 0.3)',
          }}
        >
          Info
        </button>
      </div>

      {/* Package Details Modal */}
      <PackageModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        pkg={selectedPackage} 
      />
    </div>
  );
}
