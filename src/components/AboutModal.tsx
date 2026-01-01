import { X } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AboutModal({ isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-scale-in"
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
          className="absolute top-4 right-4 p-2 rounded-full transition-all duration-200 hover:bg-white/10 z-10"
          style={{ color: 'hsl(43 60% 60%)' }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 md:p-8">
          {/* Title */}
          <h2 
            className="text-2xl md:text-3xl font-bold tracking-[0.1em] uppercase mb-6"
            style={{
              background: 'linear-gradient(135deg, hsl(38 75% 45%) 0%, hsl(43 85% 55%) 30%, hsl(48 90% 72%) 50%, hsl(43 85% 55%) 70%, hsl(38 75% 45%) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 10px hsl(43 80% 52% / 0.3))',
            }}
          >
            About Us
          </h2>
          
          {/* Content */}
          <div 
            className="space-y-5 text-sm md:text-base leading-relaxed"
            style={{ color: 'hsl(42 25% 75%)' }}
          >
            <p>
              DrivingKlass.com is a platform dedicated to providing safe, lawful driving supervision—not driving instruction. We are not a certified Driver Training School, we do not offer instruction for hire, and we are not affiliated with or certified by the Georgia Department of Driver Services (DDS).
            </p>
            
            <p>
              We meet all legal requirements to supervise friends and family members who hold a valid Georgia learner's permit. Our services are strictly limited to supervision, not instruction. In full compliance with Georgia law, we do not allow or supervise individuals without a valid learner's permit, as doing so would be unlawful under Georgia Code § 40-5-122, which prohibits knowingly allowing unlicensed individuals to operate a vehicle on public roads.
            </p>
            
            <p>
              To ensure safety and legality, DrivingKlass.com meets every state requirement for lawful driving supervision, including:
            </p>
            
            <ul className="list-disc pl-6 space-y-2">
              <li>Supervisor(s) is at least 21 years old</li>
              <li>Supervisor(s) hold a valid Class C driver's license</li>
              <li>Supervisor(s) occupy the front passenger seat at all times</li>
              <li>Supervisor(s) are capable of exercising control over the vehicle, our vehicle(s) is equipped with dual brake systems</li>
              <li>Insurance coverage is in place to support permitted drivers</li>
              <li>Parental consent is required for minors</li>
            </ul>
            
            <p>
              Additionally, DrivingKlass.com does not market or advertise as a driving school. We solely provide driving supervision for personal acquaintances, such as friends and family members, who are legally authorized to operate a vehicle under Georgia's learner's permit laws.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
