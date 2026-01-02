import { X, ExternalLink, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GOOGLE_REVIEWS_URL = "https://www.google.com/search?sca_esv=a559a6fc12046616&rlz=1CDGOYI_enUS1195US1195&hl=en-US&sxsrf=AE3TifPvC47PGU-pI0i3wMm7UnQP2gdbsQ:1767232279873&q=driving+klass+reviews&uds=AOm0WdE53ekXvDLayDVNKNWFwm3A8C_Was1ImDNr4XkjrCdKVEhlEXr5FAlM7CviBQx_zwD9whRU0cgOJkWdKMoBw51h1DlSUAkTCN8z0db0wl8mxOXUUK9UIkXFZJLUi3DlwrOCxxMdNFhiTrWx5iKWLYD78wOX8ZcvRWyvz8b90yFgu-ck-wPPoCfaczGpHtm4jRiuf-PRxrEm62F9VYdAfkN7dSQzzdvijmRp619EbQ5plyo9rGovnZA1rmlZihi6-7ghWn3qxA33d5h6o5LuKbzfiefodkMW0ZTYvNH7fNIlmu54NC5prNGGEQNH4Ytm7mDUGwpc_6eGfjQ6OuKwv2XDAEVYCXTaJn5FUyVnfGYxcmxf63wADatw66tc5jUnSBI2kqd0L2AiTcr5l2WQO_ncON2fOM5jHYpHibJaJLsy2VAVQKAnQqn9WQVjoExaTmAWNlRqzFFxoU4Y8nJp5EpozwmQgQ&si=AMgyJEtREmoPL4P1I5IDCfuA8gybfVI2d5Uj7QMwYCZHKDZ-E_pLV9LdCg15xsqpd1CNK_kN9-zobLJTl7ay5lZgqLrgl2ueBgtM1tWzDLg6WIYARK_Ezpm3FmqgKyd9MBSWmubfT6YK&sa=X&ved=2ahUKEwii6puinemRAxU85MkDHebZCc4Qk8gLegQIIRAB&ictx=1&stq=1&cs=1&lei=F9NVaeKCNbzIp84P5rOn8Aw#ebo=1";

export function ReviewsModal({ isOpen, onClose }: ReviewsModalProps) {
  if (!isOpen) return null;

  const handleOpenReviews = () => {
    window.open(GOOGLE_REVIEWS_URL, '_blank', 'noopener,noreferrer');
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
        className="relative w-full max-w-lg animate-scale-in"
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
          {/* Title */}
          <h2 
            className="text-2xl md:text-3xl font-bold tracking-[0.1em] uppercase mb-3"
            style={{
              background: 'linear-gradient(135deg, hsl(38 75% 45%) 0%, hsl(43 85% 55%) 30%, hsl(48 90% 72%) 50%, hsl(43 85% 55%) 70%, hsl(38 75% 45%) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 10px hsl(43 80% 52% / 0.3))',
            }}
          >
            Reviews
          </h2>
          
          <p 
            className="text-sm md:text-base mb-6"
            style={{ color: 'hsl(42 30% 70%)' }}
          >
            See what students are saying.
          </p>

          {/* Open Google Reviews Button */}
          <button
            onClick={handleOpenReviews}
            className={cn(
              "w-full flex items-center justify-center gap-2",
              "px-6 py-4 rounded-xl font-semibold tracking-wide uppercase text-sm",
              "transition-all duration-200 hover:scale-[0.98] active:scale-[0.96]"
            )}
            style={{
              background: 'linear-gradient(145deg, hsl(36 75% 35%) 0%, hsl(43 80% 52%) 50%, hsl(48 75% 60%) 100%)',
              color: 'hsl(30 10% 8%)',
              boxShadow: '0 4px 20px hsl(43 80% 52% / 0.3), 0 0 30px hsl(43 80% 52% / 0.15)',
            }}
          >
            <span>Open Google Reviews</span>
            <ExternalLink className="w-4 h-4" />
          </button>

          {/* Leave a Review Button */}
          <button
            onClick={() => window.open('https://g.page/r/CRABMUtSlA6IEBE/review/', '_blank', 'noopener,noreferrer')}
            className={cn(
              "w-full flex items-center justify-center gap-2 mt-3",
              "px-6 py-4 rounded-xl font-semibold tracking-wide uppercase text-sm",
              "transition-all duration-200 hover:scale-[0.98] active:scale-[0.96]"
            )}
            style={{
              background: 'transparent',
              color: 'hsl(43 80% 55%)',
              border: '2px solid hsl(43 70% 45%)',
              boxShadow: '0 2px 10px hsl(43 80% 52% / 0.15)',
            }}
          >
            <span>Leave a Review</span>
            <ExternalLink className="w-4 h-4" />
          </button>

          {/* Featured Review */}
          <div className="mt-8">
            <h3 
              className="text-sm font-semibold tracking-wide uppercase mb-4"
              style={{ color: 'hsl(43 60% 55%)' }}
            >
              Featured Review
            </h3>
            <div 
              className="p-4 rounded-xl"
              style={{
                background: 'hsl(25 5% 8%)',
                border: '1px solid hsl(43 50% 35% / 0.2)',
              }}
            >
              <div className="flex justify-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" style={{ color: 'hsl(43 80% 52%)' }} />
                ))}
              </div>
              <p className="text-sm italic mb-3" style={{ color: 'hsl(42 20% 75%)' }}>
                "Quamie is exceptional! His patience, clear guidance, and encouragement transformed me into a confident driver. I couldn't have asked for a better instructor!"
              </p>
              <p className="text-xs" style={{ color: 'hsl(42 20% 50%)' }}>
                — Manaleek Mouzon • 11 months ago
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
