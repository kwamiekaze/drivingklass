import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { HeaderBrand } from "./HeaderBrand";
import { PackageWheel } from "./PackageWheel";
import { GoldParticles } from "./GoldParticles";
import { useTheme } from "./ThemeProvider";
import goldCar from "@/assets/gold-car.png";

export function HeroSection() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handlePackageSelect = (packageId: string) => {
    console.log("Selected package:", packageId);
    // TODO: Link to Square payment when ready
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-8 sm:py-12">
      {/* Background - Gradient matching references */}
      <div 
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background: isDark 
            ? 'radial-gradient(ellipse at center top, hsl(43 30% 8%) 0%, hsl(0 0% 3%) 50%, hsl(0 0% 2%) 100%)'
            : 'radial-gradient(ellipse at center, hsl(45 40% 95%) 0%, hsl(45 35% 92%) 50%, hsl(45 30% 88%) 100%)',
        }}
      />
      
      {/* Subtle gold radial glow in center */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at center, hsl(43 74% 49% / 0.15) 0%, transparent 50%)'
            : 'radial-gradient(ellipse at center, hsl(43 74% 49% / 0.1) 0%, transparent 50%)',
        }}
      />
      
      {/* Gold particles - more visible in dark mode */}
      {isDark && <GoldParticles />}

      {/* Admin link - top right */}
      <Link
        to="/auth"
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-card/50 border border-border/50 text-muted-foreground hover:text-gold hover:border-gold/50 transition-colors backdrop-blur-sm"
        title="Admin Login"
      >
        <Settings className="w-5 h-5" />
      </Link>

      {/* Header with brand and stars */}
      <HeaderBrand className="relative z-10 mb-4 sm:mb-6 md:mb-8" />

      {/* Package Wheel with car */}
      <PackageWheel 
        carImageSrc={goldCar}
        onPackageSelect={handlePackageSelect}
      />
    </section>
  );
}
