import { useState, useMemo, useEffect, useCallback } from "react";
import { PackageButton } from "./PackageButton";
import { PackageModal } from "./PackageModal";
import { cn } from "@/lib/utils";
import { getPackagesSortedByPosition, getPackageById, type Package } from "@/data/packages";

interface PackageWheelProps {
  carImageSrc: string;
  onPackageSelect?: (packageId: string) => void;
}

export function PackageWheel({ carImageSrc, onPackageSelect }: PackageWheelProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [hasUserSelected, setHasUserSelected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const packages = useMemo(() => getPackagesSortedByPosition(), []);
  const totalButtons = packages.length;

  // Auto-orbit animation - runs only before user selection
  useEffect(() => {
    if (hasUserSelected) return;

    const interval = setInterval(() => {
      setHighlightedIndex((prev) => (prev + 1) % totalButtons);
    }, 1000);

    return () => clearInterval(interval);
  }, [hasUserSelected, totalButtons]);

  const handlePackageClick = useCallback((packageId: string) => {
    setSelectedPackageId(packageId);
    setHasUserSelected(true);
    onPackageSelect?.(packageId);
  }, [onPackageSelect]);

  const handleContinue = () => {
    if (selectedPackageId) {
      setIsModalOpen(true);
    }
  };

  // Calculate button positions in a circle
  // Starting from top (12 o'clock position) and going clockwise
  const buttonPositions = useMemo(() => {
    const positions: { x: number; y: number; angle: number; pricePosition: 'top' | 'bottom' | 'left' | 'right' }[] = [];
    
    for (let i = 0; i < totalButtons; i++) {
      // Start at -90 degrees (12 o'clock) so first package is at top
      const angleDegrees = (i / totalButtons) * 360 - 90;
      const angle = angleDegrees * (Math.PI / 180);
      
      // Determine price label position based on angle
      let pricePosition: 'top' | 'bottom' | 'left' | 'right';
      const normalizedAngle = ((angleDegrees + 90) % 360 + 360) % 360;
      
      if (normalizedAngle >= 315 || normalizedAngle < 45) {
        pricePosition = 'top';
      } else if (normalizedAngle >= 45 && normalizedAngle < 135) {
        pricePosition = 'right';
      } else if (normalizedAngle >= 135 && normalizedAngle < 225) {
        pricePosition = 'bottom';
      } else {
        pricePosition = 'left';
      }
      
      positions.push({
        x: Math.cos(angle) * 50, // 50% from center
        y: Math.sin(angle) * 50,
        angle: angleDegrees,
        pricePosition,
      });
    }
    return positions;
  }, [totalButtons]);

  const selectedPackage = selectedPackageId ? getPackageById(selectedPackageId) : null;

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Package wheel container */}
      <div 
        className="relative w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px]"
      >
        
        {/* HERO CENTER LAYER - Completely isolated, static, no interaction effects */}
        <div 
          className="absolute inset-0 flex items-center justify-center z-10"
          style={{ pointerEvents: 'none' }}
          aria-hidden="true"
        >
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
            
            {/* Static car image - no transition, no brightness changes */}
            <img 
              src={carImageSrc} 
              alt="DRIVINGKLASS Gold Car" 
              className="w-full h-auto object-contain relative z-10"
              style={{
                filter: 'contrast(1.08) saturate(1.05)',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* Package buttons positioned in circle */}
        {packages.map((pkg, index) => {
          const pos = buttonPositions[index];
          const isHighlighted = !hasUserSelected && highlightedIndex === index;
          const isSelected = selectedPackageId === pkg.id;
          
          return (
            <PackageButton
              key={pkg.id}
              label={pkg.label}
              price={pkg.price}
              isSelected={isSelected}
              isHighlighted={isHighlighted}
              showPrice={isSelected}
              pricePosition={pos.pricePosition}
              onClick={() => handlePackageClick(pkg.id)}
              style={{
                left: `calc(50% + ${pos.x}%)`,
                top: `calc(50% + ${pos.y}%)`,
                transform: 'translate(-50%, -50%)',
              }}
            />
          );
        })}
      </div>

      {/* Selected package indicator & Continue CTA - moved down with more spacing */}
      <div className="mt-12 sm:mt-16 md:mt-20 text-center pb-6">
        <div className={cn(
          "transition-all duration-300",
          selectedPackageId ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}>
          <p 
            className="text-sm mb-2"
            style={{ color: 'hsl(42 30% 65%)' }}
          >
            Selected Package
          </p>
          <p 
            className="text-lg sm:text-xl font-bold mb-1"
            style={{
              background: 'linear-gradient(135deg, hsl(43 85% 55%) 0%, hsl(48 90% 72%) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {selectedPackage?.label.replace('\n', ' ')}
          </p>
          <p 
            className="text-2xl sm:text-3xl font-bold mb-5"
            style={{
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
          onClick={handleContinue}
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
          Continue
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
