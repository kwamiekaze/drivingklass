import { Link } from "react-router-dom";
import { Settings } from "lucide-react";
import { HeaderBrand } from "./HeaderBrand";
import { PackageWheel } from "./PackageWheel";
import goldCar from "@/assets/gold-car-transparent.png";

export function HeroSection() {
  const handlePackageSelect = (packageId: string) => {
    console.log("Selected package:", packageId);
    // TODO: Link to Square payment when ready
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden px-4 py-6 sm:py-8">
      {/* Admin link - top right */}
      <Link
        to="/auth"
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-card/30 border border-gold/20 text-muted-foreground hover:text-gold hover:border-gold/50 transition-colors backdrop-blur-sm"
        title="Admin Login"
      >
        <Settings className="w-5 h-5" />
      </Link>

      {/* Header with brand and stars - raised higher with clear separation from ring */}
      <HeaderBrand className="relative z-10 mt-6 sm:mt-8 mb-8 sm:mb-12 md:mb-16" />

      {/* Package Wheel with car */}
      <PackageWheel 
        carImageSrc={goldCar}
        onPackageSelect={handlePackageSelect}
      />
    </section>
  );
}
