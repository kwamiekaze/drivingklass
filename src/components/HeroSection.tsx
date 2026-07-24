import { HeaderBrand, HeaderStars } from "./HeaderBrand";
import { PackageWheel } from "./PackageWheel";
import { ThemeToggle } from "./ThemeToggle";
import { PortalMenuButton } from "./PortalMenuButton";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  splashComplete?: boolean;
}

export function HeroSection({ splashComplete = true }: HeroSectionProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const handlePackageSelect = (packageId: string) => {
    console.log("Selected package:", packageId);
    // TODO: Link to Square payment when ready
  };

  // On mobile + light theme, use a tightly packed layout:
  // Row 1: [ThemeToggle | compact centered brand | PortalMenuButton]
  // Row 2: 5 stars (above wheel)
  // Row 3: PackageWheel (car centered on vanishing point)
  if (isLight) {
    return (
      <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden px-3 py-3 sm:py-4 md:px-4 md:py-6">
        {/* Row 1 — top band with brand centered between the two buttons (mobile).
            On md+, revert to the original stacked layout via the hidden/flex switch below. */}
        <div className="w-full md:hidden grid grid-cols-[auto_1fr_auto] items-center gap-2 mb-2">
          <ThemeToggle size="lg" />
          <HeaderBrand compact hideStars className="min-w-0" />
          <PortalMenuButton size="lg" />
        </div>

        {/* Stars row — sits in the gap between slogan and wheel on mobile */}
        <div className="w-full md:hidden flex justify-center mb-4">
          <HeaderStars />
        </div>

        {/* Desktop / tablet — keep the existing header layout unchanged */}
        <div className="hidden md:flex w-full items-center justify-between mb-6">
          <ThemeToggle />
          <PortalMenuButton />
        </div>
        <HeaderBrand className="hidden md:block relative z-10 mb-12" />

        {/* Wheel — small lift on mobile so it hugs the stars without overlap */}
        <div className="w-full flex justify-center translate-y-0 md:translate-y-0">
          <PackageWheel
            onPackageSelect={handlePackageSelect}
            splashComplete={splashComplete}
          />
        </div>
      </section>
    );
  }

  // Dark theme — original layout, unchanged
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden px-4 py-6 sm:py-8">
      <div className="w-full flex items-center justify-between mb-4 sm:mb-6">
        <ThemeToggle />
        <PortalMenuButton />
      </div>

      <HeaderBrand className={cn("relative z-10 mb-8 sm:mb-12 md:mb-16")} />

      <div className="w-full flex justify-center">
        <PackageWheel
          onPackageSelect={handlePackageSelect}
          splashComplete={splashComplete}
        />
      </div>
    </section>
  );
}
