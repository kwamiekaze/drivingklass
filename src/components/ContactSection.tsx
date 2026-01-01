import { ContactForm } from "./ContactForm";

export function ContactSection() {
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
            className="text-3xl md:text-4xl lg:text-5xl font-poppins font-extrabold tracking-[0.15em] uppercase mb-4 text-neon-gold animate-breathing-glow"
          >
            CONTACT DRIVING KLASS
          </h2>
          <p 
            className="text-base md:text-lg tracking-wide"
            style={{
              color: 'hsl(42 30% 70%)',
              textShadow: '0 0 15px hsl(43 60% 50% / 0.2)',
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
