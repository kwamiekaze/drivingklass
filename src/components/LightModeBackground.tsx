import lightBgMobile from "@/assets/light-bg-mobile.jpeg";
import lightBgDesktop from "@/assets/light-bg-desktop.jpeg";

export function LightModeBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none transition-all duration-500">
      {/* Mobile background (9:16) */}
      <div
        className="absolute inset-0 md:hidden bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${lightBgMobile})`,
        }}
      />
      
      {/* Desktop background (16:9) */}
      <div
        className="absolute inset-0 hidden md:block bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${lightBgDesktop})`,
        }}
      />
      
      {/* Subtle overlay for better text readability */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            180deg,
            hsl(0 0% 100% / 0.1) 0%,
            hsl(0 0% 100% / 0.15) 50%,
            hsl(0 0% 100% / 0.2) 100%
          )`,
        }}
      />
    </div>
  );
}
