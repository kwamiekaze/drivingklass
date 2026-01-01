import { useState, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Send, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().min(10, "Please enter a valid phone number").max(20),
  city: z.string().max(100).optional(),
  email: z.string().email("Please enter a valid email address").max(255),
  message: z.string().min(1, "Please enter a message").max(1000),
});

type FormData = z.infer<typeof formSchema>;

// Generate static stars for the contact section background
function generateContactStars(count: number) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const layer = Math.random();
    let size, opacity, twinkle;
    
    if (layer < 0.6) {
      // Tiny distant stars
      size = Math.random() * 1 + 0.5;
      opacity = Math.random() * 0.3 + 0.15;
      twinkle = Math.random() > 0.7;
    } else if (layer < 0.85) {
      // Medium stars
      size = Math.random() * 1.5 + 1;
      opacity = Math.random() * 0.4 + 0.3;
      twinkle = Math.random() > 0.5;
    } else {
      // Bright golden stars
      size = Math.random() * 2 + 1.5;
      opacity = Math.random() * 0.3 + 0.5;
      twinkle = Math.random() > 0.3;
    }
    
    stars.push({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size,
      opacity,
      twinkle,
      animationDelay: Math.random() * 4,
      animationDuration: 2 + Math.random() * 3,
    });
  }
  return stars;
}

export function ContactSection() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  
  // Memoize stars so they don't regenerate on every render
  const stars = useMemo(() => generateContactStars(120), []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      city: "",
      email: "",
      message: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      // Submit form data to database
      const { error } = await supabase.from("contact_submissions").insert({
        full_name: data.full_name,
        phone: data.phone,
        city: data.city || null,
        email: data.email,
        message: data.message,
      });

      if (error) throw error;

      // Try to send email notification (non-blocking)
      try {
        await supabase.functions.invoke("send-contact-notification", {
          body: data,
        });
      } catch {
        console.log("Email notification could not be sent");
      }

      setIsSubmitted(true);
      form.reset();
      toast({
        title: "Thanks! We'll reach out shortly.",
        description: "Your message has been received.",
      });
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section 
      id="contact" 
      className="relative w-full py-20 md:py-28 px-4 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, hsl(30 10% 3%) 0%, hsl(25 8% 2%) 50%, hsl(20 5% 1%) 100%)',
      }}
    >
      {/* Galaxy starfield background - static, no interaction effects */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        aria-hidden="true"
        style={{ zIndex: 0 }}
      >
        {stars.map((star) => (
          <div
            key={star.id}
            className={star.twinkle ? "animate-pulse" : ""}
            style={{
              position: 'absolute',
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              borderRadius: '50%',
              background: `radial-gradient(circle, hsl(45 80% 75% / ${star.opacity}) 0%, hsl(40 70% 55% / ${star.opacity * 0.5}) 50%, transparent 100%)`,
              boxShadow: star.size > 2 ? `0 0 ${star.size * 2}px hsl(43 80% 52% / ${star.opacity * 0.4})` : 'none',
              animationDelay: star.twinkle ? `${star.animationDelay}s` : undefined,
              animationDuration: star.twinkle ? `${star.animationDuration}s` : undefined,
            }}
          />
        ))}
        
        {/* Subtle gold vignette/haze toward center */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 50%, hsl(43 60% 40% / 0.06) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
      </div>

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

        {/* Success state */}
        {isSubmitted ? (
          <div 
            className="text-center p-8 md:p-10 rounded-2xl animate-scale-in"
            style={{
              background: 'linear-gradient(135deg, hsl(30 8% 8%) 0%, hsl(25 5% 6%) 100%)',
              border: '1px solid hsl(43 60% 40% / 0.3)',
              boxShadow: '0 0 40px hsl(43 80% 52% / 0.1), inset 0 1px 0 hsl(43 80% 60% / 0.1)',
            }}
          >
            <CheckCircle 
              className="w-16 h-16 mx-auto mb-4"
              style={{ color: 'hsl(43 80% 52%)' }}
            />
            <h3 
              className="text-xl md:text-2xl font-bold tracking-wide uppercase mb-3"
              style={{
                background: 'linear-gradient(135deg, hsl(38 75% 50%) 0%, hsl(48 90% 70%) 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Message Sent!
            </h3>
            <p style={{ color: 'hsl(42 20% 60%)' }} className="mb-6">
              Thanks! We'll reach out shortly.
            </p>
            <Button
              onClick={() => setIsSubmitted(false)}
              className="px-6 py-2 font-semibold tracking-wide uppercase text-sm transition-all duration-200 hover:scale-[0.98] active:scale-[0.96]"
              style={{
                background: 'linear-gradient(145deg, hsl(36 75% 35%) 0%, hsl(43 80% 52%) 50%, hsl(48 75% 60%) 100%)',
                color: 'hsl(30 10% 8%)',
                boxShadow: '0 4px 20px hsl(43 80% 52% / 0.3), 0 0 30px hsl(43 80% 52% / 0.15)',
                border: 'none',
              }}
            >
              Send Another Message
            </Button>
          </div>
        ) : (
          /* Form */
          <div 
            className="p-6 md:p-8 lg:p-10 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, hsl(30 8% 8%) 0%, hsl(25 5% 5%) 100%)',
              border: '1px solid hsl(43 60% 40% / 0.25)',
              boxShadow: '0 0 50px hsl(0 0% 0% / 0.5), 0 0 30px hsl(43 80% 52% / 0.08)',
            }}
          >
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 md:space-y-6">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel 
                        className="text-sm font-medium tracking-wide"
                        style={{ color: 'hsl(43 60% 55%)' }}
                      >
                        Full Name *
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your full name"
                          className="h-12 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-offset-0"
                          style={{
                            background: 'hsl(25 5% 6%)',
                            border: '1px solid hsl(43 50% 35% / 0.3)',
                            color: 'hsl(42 30% 90%)',
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-amber-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel 
                        className="text-sm font-medium tracking-wide"
                        style={{ color: 'hsl(43 60% 55%)' }}
                      >
                        Phone Number *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          className="h-12 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-offset-0"
                          style={{
                            background: 'hsl(25 5% 6%)',
                            border: '1px solid hsl(43 50% 35% / 0.3)',
                            color: 'hsl(42 30% 90%)',
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-amber-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel 
                        className="text-sm font-medium tracking-wide"
                        style={{ color: 'hsl(43 60% 55%)' }}
                      >
                        City
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your city"
                          className="h-12 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-offset-0"
                          style={{
                            background: 'hsl(25 5% 6%)',
                            border: '1px solid hsl(43 50% 35% / 0.3)',
                            color: 'hsl(42 30% 90%)',
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-amber-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel 
                        className="text-sm font-medium tracking-wide"
                        style={{ color: 'hsl(43 60% 55%)' }}
                      >
                        Email *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@email.com"
                          className="h-12 rounded-xl transition-all duration-200 focus:ring-2 focus:ring-offset-0"
                          style={{
                            background: 'hsl(25 5% 6%)',
                            border: '1px solid hsl(43 50% 35% / 0.3)',
                            color: 'hsl(42 30% 90%)',
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-amber-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel 
                        className="text-sm font-medium tracking-wide"
                        style={{ color: 'hsl(43 60% 55%)' }}
                      >
                        Message *
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about your driving goals..."
                          className="min-h-[120px] rounded-xl resize-none transition-all duration-200 focus:ring-2 focus:ring-offset-0"
                          style={{
                            background: 'hsl(25 5% 6%)',
                            border: '1px solid hsl(43 50% 35% / 0.3)',
                            color: 'hsl(42 30% 90%)',
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-amber-500" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-xl font-semibold tracking-wider uppercase text-sm transition-all duration-200 hover:scale-[0.98] active:scale-[0.96] disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(145deg, hsl(36 75% 35%) 0%, hsl(43 80% 52%) 50%, hsl(48 75% 60%) 100%)',
                    color: 'hsl(30 10% 8%)',
                    boxShadow: '0 4px 25px hsl(43 80% 52% / 0.35), 0 0 40px hsl(43 80% 52% / 0.15), inset 0 1px 0 hsl(48 80% 70% / 0.4)',
                    border: 'none',
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </div>
    </section>
  );
}
