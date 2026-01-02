import { X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Package } from "@/data/packages";
import { useAnalytics } from "@/hooks/useAnalytics";

interface PackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  pkg: Package | null;
}

export function PackageModal({ isOpen, onClose, pkg }: PackageModalProps) {
  const { trackClick } = useAnalytics();
  
  if (!isOpen || !pkg) return null;

  const handleBook = () => {
    // Track book click
    trackClick("book_click", { package_id: pkg.id, square_url: pkg.squareUrl });
    
    // Try to open in new tab, fallback to same tab if blocked
    const newWindow = window.open(pkg.squareUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Popup was blocked, open in same tab
      window.location.href = pkg.squareUrl;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-md animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, hsl(30 10% 8% / 0.95) 0%, hsl(25 8% 5% / 0.95) 100%)',
          border: '1px solid hsl(43 60% 40% / 0.4)',
          borderRadius: '1.25rem',
          boxShadow: '0 0 50px hsl(43 80% 52% / 0.15), 0 25px 50px -12px hsl(0 0% 0% / 0.5)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full transition-all duration-200 hover:bg-white/10"
          style={{ color: 'hsl(43 60% 60%)' }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8">
          {/* Title - Package Label */}
          <h2 
            className="text-2xl md:text-3xl font-bold tracking-[0.1em] uppercase mb-2"
            style={{
              background: 'linear-gradient(135deg, hsl(38 75% 45%) 0%, hsl(43 85% 55%) 30%, hsl(48 90% 72%) 50%, hsl(43 85% 55%) 70%, hsl(38 75% 45%) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 10px hsl(43 80% 52% / 0.3))',
            }}
          >
            {pkg.label.replace('\n', ' ')}
          </h2>
          
          {/* Price */}
          <p 
            className="text-3xl md:text-4xl font-bold mb-6"
            style={{
              background: 'linear-gradient(135deg, hsl(43 85% 55%) 0%, hsl(48 90% 72%) 50%, hsl(43 85% 55%) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 15px hsl(43 80% 52% / 0.4))',
            }}
          >
            {pkg.price}
          </p>
          
          {/* Description */}
          <p 
            className="text-sm md:text-base leading-relaxed mb-8"
            style={{ color: 'hsl(42 25% 75%)' }}
          >
            {pkg.description}
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleBook}
              className={cn(
                "flex-1 flex items-center justify-center gap-2",
                "px-6 py-4 rounded-xl font-semibold tracking-wide uppercase text-sm",
                "transition-all duration-200 hover:scale-[0.98] active:scale-[0.96]"
              )}
              style={{
                background: 'linear-gradient(145deg, hsl(36 75% 35%) 0%, hsl(43 80% 52%) 50%, hsl(48 75% 60%) 100%)',
                color: 'hsl(30 10% 8%)',
                boxShadow: '0 4px 20px hsl(43 80% 52% / 0.3), 0 0 30px hsl(43 80% 52% / 0.15)',
              }}
            >
              <span>Book Now</span>
              <ExternalLink className="w-4 h-4" />
            </button>
            
            <button
              onClick={onClose}
              className={cn(
                "px-6 py-4 rounded-xl font-semibold tracking-wide uppercase text-sm",
                "transition-all duration-200 hover:scale-[0.98] active:scale-[0.96]"
              )}
              style={{
                background: 'hsl(30 8% 12%)',
                color: 'hsl(42 30% 70%)',
                border: '1px solid hsl(43 50% 35% / 0.3)',
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
