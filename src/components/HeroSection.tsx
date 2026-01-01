import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { HeaderBrand } from "./HeaderBrand";
import { PackageWheel } from "./PackageWheel";
import { GalaxyStars } from "./GalaxyStars";
import { useTheme } from "./ThemeProvider";
import goldCar from "@/assets/gold-car-transparent.png";

export function HeroSection() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handlePackageSelect = (packageId: string) => {
    console.log("Selected package:", packageId);
    // TODO: Link to Square payment when ready
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden px-4 py-6 sm:py-8">
      {/* Background - Deep cinematic gradient */}
      <div 
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background: isDark 
            ? 'linear-gradient(180deg, hsl(30 15% 4%) 0%, hsl(0 0% 2%) 30%, hsl(0 0% 1%) 100%)'
            : 'radial-gradient(ellipse at center, hsl(45 40% 95%) 0%, hsl(45 35% 92%) 50%, hsl(45 30% 88%) 100%)',
        }}
      />
      
      {/* Subtle gold atmospheric glow in center - deeper for dark mode */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 80% 60% at 50% 55%, hsl(40 80% 30% / 0.12) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at center, hsl(43 74% 49% / 0.08) 0%, transparent 50%)',
        }}
      />
      
      {/* Galaxy stars - realistic astronomical background */}
      {isDark && <GalaxyStars />}

      {/* Admin link - top right */}
      <Link
        to="/auth"
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-card/30 border border-gold/20 text-muted-foreground hover:text-gold hover:border-gold/50 transition-colors backdrop-blur-sm"
        title="Admin Login"
      >
        <Settings className="w-5 h-5" />
      </Link>

      {/* Header with brand and stars - positioned at top with proper spacing */}
      <HeaderBrand className="relative z-10 mt-8 sm:mt-12 mb-6 sm:mb-10 md:mb-12" />

      {/* Package Wheel with car */}
      <PackageWheel 
        carImageSrc={goldCar}
        onPackageSelect={handlePackageSelect}
      />
    </section>
  );
}
