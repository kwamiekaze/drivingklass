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
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-[0.15em] uppercase mb-4"
            style={{
              fontFamily: 'inherit',
              background: 'linear-gradient(135deg, hsl(38 75% 45%) 0%, hsl(43 85% 55%) 30%, hsl(48 90% 72%) 50%, hsl(43 85% 55%) 70%, hsl(38 75% 45%) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 40px hsl(43 80% 52% / 0.35)',
              filter: 'drop-shadow(0 0 20px hsl(43 80% 52% / 0.25))',
            }}
          >
            Contact Driving Klass
          </h2>
          <p 
            className="text-base md:text-lg tracking-wide"
            style={{
              color: 'hsl(42 30% 70%)',
              textShadow: '0 0 15px hsl(43 60% 50% / 0.2)',
            }}
          >
            Tell us what you need and we'll get you scheduled.
          </p>
        </div>

        <ContactForm />
      </div>
    </section>
  );
}
