import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AnimatedStars } from "./AnimatedStars";
import { ServiceButton } from "./ServiceButton";
import { ServiceModal } from "./ServiceModal";
import { GoldParticles } from "./GoldParticles";
import { Settings } from "lucide-react";
import goldCar from "@/assets/gold-car.png";

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

      {/* Admin link - top right */}
      <Link
        to="/auth"
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-card/50 border border-border/50 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
        title="Admin Login"
      >
        <Settings className="w-5 h-5" />
      </Link>

      {/* Header */}
      <header className="relative z-10 text-center mb-8 md:mb-12">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-gold-shimmer tracking-tight">
          DRIVINGKLASS
        </h1>
        <div className="mt-4">
          <AnimatedStars count={5} />
        </div>
      </header>

      {/* Gold Car Image */}
      <div className="relative z-10 w-full max-w-sm md:max-w-lg lg:max-w-2xl flex items-center justify-center mb-8">
        <div className="relative">
          {/* Headlight glow effects */}
          <div className="absolute left-[10%] top-[45%] w-10 h-10 md:w-16 md:h-16 rounded-full bg-gold/40 blur-2xl animate-headlight" />
          <div className="absolute left-[5%] top-[50%] w-6 h-6 md:w-10 md:h-10 rounded-full bg-gold-shimmer/60 blur-xl animate-headlight" style={{ animationDelay: '0.5s' }} />
          
          {/* Car shadow */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-8 bg-black/30 blur-2xl rounded-full" />
          
          {/* Car image */}
          <img 
            src={goldCar} 
            alt="DRIVINGKLASS Gold Car" 
            className="relative w-full h-auto drop-shadow-2xl"
          />
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
