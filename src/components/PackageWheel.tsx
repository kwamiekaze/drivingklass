import { useState, useMemo } from "react";
import { PackageButton } from "./PackageButton";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

// Fixed package labels - ORDER matches reference exactly (2 HR at 12 o'clock, going clockwise)
// Reference shows: 2HR (top) → 4HR → 6HR → 8HR → 10HR → 20HR → 30HR → 40HR → RdTest → 1Hr+RdTest → 2Hr+RdTest → 1HR
const PACKAGES = [
  { id: "2hr", label: "2 HR" },     // 12 o'clock (top)
  { id: "4hr", label: "4 HR" },     // 1 o'clock
  { id: "6hr", label: "6 HR" },     // 2 o'clock
  { id: "8hr", label: "8 HR" },     // 3 o'clock
  { id: "10hr", label: "10 HR" },   // 4 o'clock
  { id: "20hr", label: "20 HR" },   // 5 o'clock
  { id: "30hr", label: "30 HR" },   // 6 o'clock (bottom)
  { id: "40hr", label: "40 HR" },   // 7 o'clock
  { id: "rdtest", label: "Rd Test" }, // 8 o'clock
  { id: "1hr-rdtest", label: "1Hr +\nRd Test" }, // 9 o'clock
  { id: "2hr-rdtest", label: "2Hr +\nRd Test" }, // 10 o'clock
  { id: "1hr", label: "1 HR" },     // 11 o'clock
];

interface PackageWheelProps {
  carImageSrc: string;
  onPackageSelect?: (packageId: string) => void;
  carGlow?: boolean;
}

export function PackageWheel({ carImageSrc, onPackageSelect, carGlow = false }: PackageWheelProps) {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isCarGlowing, setIsCarGlowing] = useState(false);

  const handlePackageClick = (packageId: string) => {
    setSelectedPackage(packageId);
    onPackageSelect?.(packageId);
    
    // Trigger car glow effect
    setIsCarGlowing(true);
    setTimeout(() => setIsCarGlowing(false), 600);
  };

  // Calculate button positions in a circle
  // Starting from top (12 o'clock position) and going clockwise
  const buttonPositions = useMemo(() => {
    const positions: { x: number; y: number; angle: number }[] = [];
    const totalButtons = PACKAGES.length;
    
    // Start at -90 degrees (12 o'clock) so "2 HR" is at top
    // Buttons are positioned clockwise
    for (let i = 0; i < totalButtons; i++) {
      // Adjust so 2 HR is at top center, going clockwise
      const angle = ((i / totalButtons) * 360 - 90) * (Math.PI / 180);
      positions.push({
        x: Math.cos(angle) * 50, // 50% from center
        y: Math.sin(angle) * 50,
        angle: (i / totalButtons) * 360 - 90,
      });
    }
    return positions;
  }, []);

  const selectedPackageLabel = PACKAGES.find(p => p.id === selectedPackage)?.label.replace('\n', ' ');

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Package wheel container - NO rectangular/square borders */}
      <div 
        className="relative w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px]"
      >
        
        {/* Center car container */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className={cn(
            "relative w-[50%] flex items-center justify-center transition-all duration-300",
            (isCarGlowing || carGlow) && "brightness-105"
          )}>
            {/* Cinematic shadow/reflection under car */}
            <div 
              className="absolute bottom-[-8%] left-1/2 -translate-x-1/2 w-[85%] h-8"
              style={{
                background: 'radial-gradient(ellipse at center, hsl(0 0% 0% / 0.6) 0%, hsl(0 0% 0% / 0.3) 40%, transparent 70%)',
                filter: 'blur(12px)',
              }}
            />
            
            {/* Car image */}
            <img 
              src={carImageSrc} 
              alt="DRIVINGKLASS Gold Car" 
              className={cn(
                "w-full h-auto object-contain transition-all duration-300",
                (isCarGlowing || carGlow) && "brightness-110"
              )}
            />
          </div>
        </div>

        {/* Package buttons positioned in circle */}
        {PACKAGES.map((pkg, index) => {
          const pos = buttonPositions[index];
          return (
            <PackageButton
              key={pkg.id}
              label={pkg.label}
              isSelected={selectedPackage === pkg.id}
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

      {/* Selected package indicator & CTA */}
      <div className={cn(
        "mt-6 text-center transition-all duration-300",
        selectedPackage ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
      )}>
        <p className="text-sm text-muted-foreground mb-3">
          Selected: <span className="font-semibold text-gold">{selectedPackageLabel}</span>
        </p>
        <Button 
          size="lg"
          className={cn(
            "bg-gold hover:bg-gold-dark text-primary-foreground font-bold",
            "px-8 py-6 text-lg rounded-full",
            "shadow-gold hover:shadow-gold-lg transition-all duration-300"
          )}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
