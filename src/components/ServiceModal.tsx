import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Service {
  id: string;
  title: string;
  price: string;
  description: string | null;
  square_link: string | null;
}

interface ServiceModalProps {
  service: Service | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ServiceModal({ service, isOpen, onClose }: ServiceModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !service) return null;

  const handleBookNow = () => {
    if (service.square_link) {
      window.open(service.square_link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-4">
        <div className="luxury-card w-full max-w-lg mx-auto animate-slide-up md:animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gold/20">
            <div>
              <h2 className="text-2xl font-display font-bold text-gold-shimmer">
                {service.title}
              </h2>
              <p className="text-3xl font-bold text-primary mt-1">
                {service.price}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gold/10 transition-colors"
            >
              <X className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-muted-foreground leading-relaxed">
              {service.description || "Professional driving instruction tailored to your needs."}
            </p>

            {/* Features */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-gold" />
                <span className="text-foreground">Certified Professional Instructor</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-gold" />
                <span className="text-foreground">Modern, Safe Vehicles</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-gold" />
                <span className="text-foreground">Flexible Scheduling</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gold/20">
            <Button
              onClick={handleBookNow}
              disabled={!service.square_link}
              className="w-full h-14 text-lg font-semibold bg-gold-gradient hover:opacity-90 text-primary-foreground transition-all duration-300 hover:shadow-gold-lg disabled:opacity-50"
            >
              {service.square_link ? (
                <>
                  Book Now
                  <ExternalLink className="w-5 h-5 ml-2" />
                </>
              ) : (
                "Coming Soon"
              )}
            </Button>
            {!service.square_link && (
              <p className="text-center text-sm text-muted-foreground mt-3">
                Payment link not yet configured
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
