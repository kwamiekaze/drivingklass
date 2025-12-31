import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedStars } from "./AnimatedStars";
import { ServiceButton } from "./ServiceButton";
import { ServiceModal } from "./ServiceModal";
import { GoldParticles } from "./GoldParticles";

interface Service {
  id: string;
  title: string;
  price: string;
  description: string | null;
  square_link: string | null;
  display_order: number;
}

export function HeroSection() {
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as Service[];
    },
  });

  const openModal = (service: Service) => {
    setSelectedService(service);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
  };

  // Split services into groups for orbital layout
  const topServices = services.slice(0, 4);
  const middleServices = services.slice(4, 8);
  const bottomServices = services.slice(8);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-12">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gold-radial opacity-30" />
      
      {/* Gold particles */}
      <GoldParticles />

      {/* Header */}
      <header className="relative z-10 text-center mb-8 md:mb-12">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-gold-shimmer tracking-tight">
          DRIVINGKLASS
        </h1>
        <div className="mt-4">
          <AnimatedStars count={5} />
        </div>
      </header>

      {/* Car Image Placeholder - will be replaced with uploaded image */}
      <div className="relative z-10 w-full max-w-md md:max-w-xl lg:max-w-2xl aspect-video flex items-center justify-center mb-8">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Headlight glow effects */}
          <div className="absolute left-[15%] top-[40%] w-8 h-8 md:w-12 md:h-12 rounded-full bg-gold-shimmer/50 blur-xl animate-headlight" />
          <div className="absolute right-[15%] top-[40%] w-8 h-8 md:w-12 md:h-12 rounded-full bg-gold-shimmer/50 blur-xl animate-headlight" style={{ animationDelay: '0.5s' }} />
          
          {/* Car placeholder */}
          <div className="w-full h-full bg-gradient-to-b from-gold/10 to-transparent rounded-3xl border border-gold/20 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Car image will appear here</p>
          </div>
        </div>
      </div>

      {/* Service Buttons - Orbital Layout */}
      <div className="relative z-10 w-full max-w-4xl">
        {/* Top row */}
        <div className="flex justify-center gap-3 md:gap-4 lg:gap-6 mb-4">
          {topServices.map((service, index) => (
            <ServiceButton
              key={service.id}
              title={service.title}
              onClick={() => openModal(service)}
              className="animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            />
          ))}
        </div>

        {/* Middle row */}
        <div className="flex justify-center gap-3 md:gap-4 lg:gap-6 mb-4">
          {middleServices.map((service, index) => (
            <ServiceButton
              key={service.id}
              title={service.title}
              onClick={() => openModal(service)}
              className="animate-scale-in"
              style={{ animationDelay: `${(index + 4) * 100}ms` }}
            />
          ))}
        </div>

        {/* Bottom row */}
        <div className="flex justify-center gap-3 md:gap-4 lg:gap-6">
          {bottomServices.map((service, index) => (
            <ServiceButton
              key={service.id}
              title={service.title}
              onClick={() => openModal(service)}
              className="animate-scale-in"
              style={{ animationDelay: `${(index + 8) * 100}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Service Modal */}
      <ServiceModal
        service={selectedService}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </section>
  );
}
