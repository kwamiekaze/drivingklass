import { Link } from "react-router-dom";
import { HeaderBrand } from "./HeaderBrand";
import { PackageWheel } from "./PackageWheel";
import goldCar from "@/assets/gold-car-transparent.png";
import portalCarIcon from "@/assets/portal-car-icon.png";

export function HeroSection() {
  const handlePackageSelect = (packageId: string) => {
    console.log("Selected package:", packageId);
    // TODO: Link to Square payment when ready
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden px-4 py-6 sm:py-8">
      {/* Portal link - top right - Gold Sportcar icon */}
      <Link
        to="/auth"
        className="absolute top-4 right-4 z-20 p-1.5 rounded-full bg-card/40 border border-gold/30 hover:border-gold/60 hover:bg-gold/10 transition-all duration-300 backdrop-blur-sm group"
        title="Klassroom Portal"
        aria-label="Klassroom Portal"
      >
        <img 
          src={portalCarIcon} 
          alt="Klassroom Portal" 
          className="w-8 h-8 object-contain group-hover:scale-110 transition-transform drop-shadow-[0_0_4px_rgba(212,175,55,0.5)]"
        />
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
