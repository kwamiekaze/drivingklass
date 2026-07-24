import { useState, useCallback } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeroSection } from "@/components/HeroSection";
import { ContactSection } from "@/components/ContactSection";
import { NavigationButtons } from "@/components/NavigationButtons";
import { ReviewsModal } from "@/components/ReviewsModal";
import { AboutModal } from "@/components/AboutModal";
import { LightModeBackground } from "@/components/LightModeBackground";
import { DarkModeBackground } from "@/components/DarkModeBackground";
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
  
  // Track when splash is complete (for animation delay)
  const [splashComplete, setSplashComplete] = useState(() => {
    // If we skip splash (desktop), it's already complete
    if (typeof window !== 'undefined') {
      return window.matchMedia("(min-width: 768px)").matches;
    }
    return false;
  });
  
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    setSplashComplete(true);
  }, []);

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

        {/* Content wrapper */}
        <div className="relative" style={{ zIndex: 10 }}>
          {/* Hero Section with car and package wheel - pass splashComplete */}
          <HeroSection
            splashComplete={splashComplete}
            onReviewsClick={isDark ? undefined : () => setIsReviewsOpen(true)}
            onAboutClick={isDark ? undefined : () => setIsAboutOpen(true)}
          />

          {/* Navigation Buttons — only in normal flow for dark theme.
              Light theme renders them absolutely inside the hero. */}
          {isDark && (
            <NavigationButtons
              onReviewsClick={() => setIsReviewsOpen(true)}
              onAboutClick={() => setIsAboutOpen(true)}
            />
          )}

          {/* Contact Section */}
          <ContactSection />
        </div>

        {/* Modals */}
        <ReviewsModal isOpen={isReviewsOpen} onClose={() => setIsReviewsOpen(false)} />
        <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      </div>
    </>
  );
};

export default Index;