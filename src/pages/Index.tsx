import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeroSection } from "@/components/HeroSection";
import { ContactSection } from "@/components/ContactSection";
import { NavigationButtons } from "@/components/NavigationButtons";
import { ReviewsModal } from "@/components/ReviewsModal";
import { AboutModal } from "@/components/AboutModal";
import { MediaModal } from "@/components/MediaModal";
import { GalaxyStars } from "@/components/GalaxyStars";
import { LightModeBackground } from "@/components/LightModeBackground";
import { SplashScreen } from "@/components/SplashScreen";
import { useTheme } from "@/components/ThemeProvider";

const Index = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  
  // Check if desktop/tablet on initial render - skip splash for >= 768px
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      return !window.matchMedia("(min-width: 768px)").matches;
    }
    return true;
  });
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(false);

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <>
      {/* Cinematic Splash Screen */}
      {showSplash && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}

      <div 
        className={`min-h-screen relative transition-opacity duration-500 ${
          showSplash ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Fixed background layer - theme aware */}
        <div className="fixed inset-0" style={{ zIndex: 0 }}>
          {isDark ? (
            <>
              {/* Dark mode - rich black gradient */}
              <div 
                className="absolute inset-0 transition-colors duration-500"
                style={{
                  background: 'linear-gradient(180deg, hsl(30 15% 4%) 0%, hsl(0 0% 2%) 30%, hsl(0 0% 1%) 100%)',
                }}
              />
              {/* Subtle gold atmospheric glow */}
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 80% 60% at 50% 35%, hsl(40 80% 30% / 0.12) 0%, transparent 60%)',
                }}
              />
              {/* Galaxy stars */}
              <GalaxyStars />
            </>
          ) : (
            <>
              {/* Light mode - warm sunlit driving school background */}
              <LightModeBackground />
            </>
          )}
        </div>

        {/* Theme Toggle - top left */}
        <div className="fixed top-4 left-4 z-50">
          <ThemeToggle />
        </div>

        {/* Content wrapper */}
        <div className="relative" style={{ zIndex: 10 }}>
          {/* Hero Section with car and package wheel */}
          <HeroSection />

          {/* Navigation Buttons */}
          <NavigationButtons 
            onReviewsClick={() => setIsReviewsOpen(true)}
            onAboutClick={() => setIsAboutOpen(true)}
            onMediaClick={() => setIsMediaOpen(true)}
          />

          {/* Contact Section */}
          <ContactSection />
        </div>

        {/* Modals */}
        <ReviewsModal isOpen={isReviewsOpen} onClose={() => setIsReviewsOpen(false)} />
        <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
        <MediaModal isOpen={isMediaOpen} onClose={() => setIsMediaOpen(false)} />
      </div>
    </>
  );
};

export default Index;