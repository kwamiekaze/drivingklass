import { HeaderBrand } from "./HeaderBrand";
import { PackageWheel } from "./PackageWheel";
import { ThemeToggle } from "./ThemeToggle";
import { PortalMenuButton } from "./PortalMenuButton";

interface HeroSectionProps {
  splashComplete?: boolean;
}

export function HeroSection({ splashComplete = true }: HeroSectionProps) {
  const handlePackageSelect = (packageId: string) => {
    console.log("Selected package:", packageId);
    // TODO: Link to Square payment when ready
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden px-4 py-6 sm:py-8">
      {/* Header row with theme toggle and portal button */}
      <div className="w-full flex items-center justify-between mb-4 sm:mb-6">
        {/* Theme Toggle - top left */}
        <ThemeToggle />

        {/* Gold car dropdown - Dashboard / Play / Profile / Install */}
        <PortalMenuButton />
      </div>

      {/* Header with brand and stars - raised higher with clear separation from ring */}
      <HeaderBrand className="relative z-10 mb-8 sm:mb-12 md:mb-16" />

      {/* Package Wheel with car - pass splashComplete for animation delay */}
      <PackageWheel 
        onPackageSelect={handlePackageSelect}
        splashComplete={splashComplete}
      />
    </section>
  );
}
