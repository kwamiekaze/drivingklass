import { useState } from "react";
import { getPackagesSortedByPosition, type Package } from "@/data/packages";
import { PackageModal } from "@/components/PackageModal";
import { useAnalytics } from "@/hooks/useAnalytics";
import carImage from "@/assets/car-headlights-off.png";

/**
 * Static, motion-free hero + full DOM grid of price cards.
 * Used for reduced-motion, low-end devices, or when WebGL is unavailable.
 * All functionality (modal, Square booking) is identical to the animated version.
 */
export function PosterFallback() {
  const packages = getPackagesSortedByPosition();
  const [openId, setOpenId] = useState<string | null>(null);
  const openPkg = openId ? packages.find((p) => p.id === openId) ?? null : null;
  const { trackClick } = useAnalytics();

  const handleOpen = (pkg: Package) => {
    trackClick("package_select", { package_id: pkg.id });
    trackClick("open_info", { package_id: pkg.id });
    setOpenId(pkg.id);
  };

  return (
    <div className="w-full flex flex-col items-center gap-8 pt-6 pb-12">
      <div className="relative w-[min(80vw,420px)] aspect-[3/4] flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-3xl"
          style={{
            background:
              "radial-gradient(ellipse at center, hsl(43 60% 40% / 0.22), transparent 65%)",
            filter: "blur(20px)",
          }}
        />
        <img
          src={carImage}
          alt="DrivingKlass gold five-star training car"
          className="relative w-full h-auto object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.5)]"
        />
      </div>

      <h1
        className="text-center font-bold tracking-wider"
        style={{
          fontSize: "clamp(28px, 6vw, 48px)",
          background:
            "linear-gradient(135deg, hsl(43 85% 55%), hsl(48 90% 72%), hsl(43 85% 55%))",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Where 5-Star Drivers Are Made
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-w-4xl px-2">
        {packages.map((pkg) => (
          <button
            key={pkg.id}
            type="button"
            onClick={() => handleOpen(pkg)}
            className="text-left rounded-2xl px-4 py-3 transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2"
            style={{
              background:
                "linear-gradient(135deg, hsl(30 12% 10% / 0.9), hsl(25 10% 5% / 0.95))",
              border: "1px solid hsl(43 65% 45% / 0.6)",
              boxShadow: "0 6px 18px hsl(0 0% 0% / 0.5)",
              color: "hsl(42 30% 88%)",
            }}
          >
            <div
              className="text-[10px] tracking-[0.2em] uppercase mb-1"
              style={{ color: "hsl(42 30% 65%)" }}
            >
              Klass
            </div>
            <div
              className="font-bold text-sm leading-tight mb-1.5 whitespace-pre-line"
              style={{ color: "hsl(42 30% 92%)" }}
            >
              {pkg.label}
            </div>
            <div
              className="font-bold text-xl leading-none"
              style={{
                background:
                  "linear-gradient(135deg, hsl(43 85% 55%), hsl(48 90% 72%))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {pkg.price}
            </div>
          </button>
        ))}
      </div>

      <PackageModal
        isOpen={!!openPkg}
        onClose={() => setOpenId(null)}
        pkg={openPkg}
      />
    </div>
  );
}
