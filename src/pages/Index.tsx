import { ThemeToggle } from "@/components/ThemeToggle";
import { HeroSection } from "@/components/HeroSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Theme Toggle - top left */}
      <div className="fixed top-4 left-4 z-50">
        <ThemeToggle />
      </div>

      {/* Hero Section with car and package wheel */}
      <HeroSection />
    </div>
  );
};

export default Index;
