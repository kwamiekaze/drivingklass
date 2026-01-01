import { ContactForm } from "./ContactForm";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

export function ContactSection() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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
              "transition-colors duration-300",
              isDark && "text-neon-gold animate-breathing-glow"
            )}
            style={{
              color: isDark ? 'hsl(48 90% 78%)' : 'hsl(0 0% 12%)',
              textShadow: isDark 
                ? undefined
                : '0 0 2px hsl(43 75% 50% / 0.8), 0 0 10px hsl(43 75% 50% / 0.4), 1px 1px 0 hsl(43 75% 50% / 0.3), -1px -1px 0 hsl(43 75% 50% / 0.3)',
            }}
          >
            CONTACT DRIVING KLASS
          </h2>
          <p 
            className="text-base md:text-lg tracking-wide transition-colors duration-300"
            style={{
              color: isDark ? 'hsl(42 30% 70%)' : 'hsl(0 0% 30%)',
              textShadow: isDark 
                ? '0 0 15px hsl(43 60% 50% / 0.2)'
                : '0 0 5px hsl(43 75% 50% / 0.25)',
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
