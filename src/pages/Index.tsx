import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeroSection } from "@/components/HeroSection";
import { ContactSection } from "@/components/ContactSection";
import { NavigationButtons } from "@/components/NavigationButtons";
import { ReviewsModal } from "@/components/ReviewsModal";
import { AboutModal } from "@/components/AboutModal";
import { MediaModal } from "@/components/MediaModal";
import { GalaxyStars } from "@/components/GalaxyStars";
import { useTheme } from "@/components/ThemeProvider";

const Index = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(false);

  return (
    <div className="min-h-screen relative">
      {/* Fixed galaxy background for entire page */}
      <div 
        className="fixed inset-0 transition-colors duration-500"
        style={{
          background: isDark 
            ? 'linear-gradient(180deg, hsl(30 15% 4%) 0%, hsl(0 0% 2%) 30%, hsl(0 0% 1%) 100%)'
            : 'radial-gradient(ellipse at center, hsl(45 40% 95%) 0%, hsl(45 35% 92%) 50%, hsl(45 30% 88%) 100%)',
          zIndex: 0,
        }}
      />
      
      {/* Subtle gold atmospheric glow */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 80% 60% at 50% 35%, hsl(40 80% 30% / 0.12) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at center, hsl(43 74% 49% / 0.08) 0%, transparent 50%)',
          zIndex: 1,
        }}
      />
      
      {/* Galaxy stars - fixed position, visible in dark mode only */}
      {isDark && (
        <div className="fixed inset-0" style={{ zIndex: 2 }}>
          <GalaxyStars />
        </div>
      )}

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
  );
};

export default Index;
