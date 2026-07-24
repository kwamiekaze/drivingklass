import { HeaderBrand, HeaderStars } from "./HeaderBrand";
import { PackageWheel } from "./PackageWheel";
import { ThemeToggle } from "./ThemeToggle";
import { PortalMenuButton } from "./PortalMenuButton";
import { NavigationButtons } from "./NavigationButtons";

interface HeroSectionProps {
  splashComplete?: boolean;
  onReviewsClick?: () => void;
  onAboutClick?: () => void;
}

export function HeroSection({ splashComplete = true, onReviewsClick, onAboutClick }: HeroSectionProps) {
  const handlePackageSelect = (packageId: string) => {
    console.log("Selected package:", packageId);
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden px-3 py-3 sm:py-4 md:px-4 md:py-6">
      {/* Row 1 — mobile compact header */}
      <div className="w-full md:hidden grid grid-cols-[auto_1fr_auto] items-center gap-2 mb-2">
        <ThemeToggle size="lg" />
        <HeaderBrand compact hideStars className="min-w-0" />
        <PortalMenuButton size="lg" />
      </div>

      <div className="w-full md:hidden flex justify-center mb-12">
        <HeaderStars />
      </div>

      {/* Desktop / tablet */}
      <div className="hidden md:flex w-full items-center justify-between mb-6">
        <ThemeToggle />
        <PortalMenuButton />
      </div>
      <HeaderBrand className="hidden md:block relative z-10 mb-12" />

      <div className="w-full flex justify-center mt-2 md:mt-0">
        <PackageWheel
          onPackageSelect={handlePackageSelect}
          splashComplete={splashComplete}
        />
      </div>

      {/* Nav buttons — absolutely positioned over the lower steering-wheel area of the hero video.
          Scrolls away with the hero (not fixed). */}
      {onReviewsClick && onAboutClick && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-20 w-full max-w-[520px] md:bottom-[7vh] bottom-[12.5vh]"
          style={{ pointerEvents: "auto" }}
        >
          <NavigationButtons
            onReviewsClick={onReviewsClick}
            onAboutClick={onAboutClick}
            overlay
          />
        </div>
      )}
    </section>
  );
}
