import { HeaderBrand } from "./HeaderBrand";
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

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden px-4 py-6 sm:py-8">
      {/* Header row with theme toggle and portal button */}
      <div className="w-full flex items-center justify-between mb-4 sm:mb-6">
        <ThemeToggle />
        <PortalMenuButton />
      </div>

      {/* Header with brand and stars - tighter on light theme mobile so the car sits over the vanishing point */}
      <HeaderBrand
        className={cn(
          "relative z-10",
          isLight
            ? "mb-2 sm:mb-6 md:mb-12"
            : "mb-8 sm:mb-12 md:mb-16"
        )}
      />

      {/* Package Wheel with car — in light theme, shift the whole wheel (car + ring) up
          on mobile so the car sits centered on the road's vanishing point (~30-35% from top).
          Wheel and car move as one unit; nothing about CarShowcase internals or wheel structure changes. */}
      <div
        className={cn(
          "w-full flex justify-center",
          isLight ? "-translate-y-6 sm:-translate-y-2 md:translate-y-0" : ""
        )}
      >
        <PackageWheel
          onPackageSelect={handlePackageSelect}
          splashComplete={splashComplete}
        />
      </div>
    </section>
  );
}
