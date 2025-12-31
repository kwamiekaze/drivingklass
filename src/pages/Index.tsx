import { ThemeToggle } from "@/components/ThemeToggle";
import { HeroSection } from "@/components/HeroSection";
import { ContactForm } from "@/components/ContactForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Theme Toggle - top left */}
      <div className="fixed top-4 left-4 z-50">
        <ThemeToggle />
      </div>

      {/* Hero Section with car and services */}
      <HeroSection />

      {/* Contact Form Section */}
      <section id="contact" className="py-16 md:py-24 px-4 bg-card/50">
        <div className="container mx-auto max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center text-gold-shimmer mb-8">
            Get In Touch
          </h2>
          <ContactForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border bg-background">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} DRIVINGKLASS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
