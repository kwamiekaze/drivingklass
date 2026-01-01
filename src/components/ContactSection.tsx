import { ContactForm } from "./ContactForm";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

export function ContactSection() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  return (
    <section 
      id="contact" 
      className="relative w-full py-20 md:py-28 px-4"
    >
      {/* Content container */}
      <div className="relative z-10 max-w-[480px] md:max-w-[680px] lg:max-w-[800px] mx-auto">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <h2 
            className={cn(
              "text-3xl md:text-4xl lg:text-5xl font-poppins font-extrabold tracking-[0.15em] uppercase mb-4",
              !isLight && "text-neon-gold animate-breathing-glow"
            )}
            style={{
              color: isLight ? '#1a1a1a' : '#FFD700',
              textShadow: isLight 
                ? '0 0 2px rgba(212, 175, 55, 0.9), 0 0 8px rgba(212, 175, 55, 0.5), 1px 1px 0 rgba(212, 175, 55, 0.4), -1px -1px 0 rgba(212, 175, 55, 0.4)'
                : undefined,
            }}
          >
            CONTACT DRIVING KLASS
          </h2>
          <p 
            className="text-base md:text-lg tracking-wide"
            style={{
              color: isLight ? '#3d3d3d' : 'hsl(42 30% 70%)',
              textShadow: isLight 
                ? '0 0 4px rgba(212, 175, 55, 0.4)'
                : '0 0 15px hsl(43 60% 50% / 0.2)',
            }}
          >
            Tell us what you need, get in touch.
          </p>
        </div>

        <ContactForm />
      </div>
    </section>
  );
}
