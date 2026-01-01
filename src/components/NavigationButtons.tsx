import { cn } from "@/lib/utils";

interface NavButtonProps {
  label: string;
  onClick: () => void;
}

function NavButton({ label, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center",
        "px-6 py-3 sm:px-8 sm:py-3.5",
        "rounded-full cursor-pointer select-none",
        "transition-all duration-200 ease-out",
        "p-[2px]",
        // Subtle glow - controlled, not neon
        "shadow-[0_0_12px_hsl(43_80%_50%/0.25),0_0_24px_hsl(43_80%_50%/0.1)]",
        // Hover state - gentle brightness and glow intensifies
        "hover:brightness-110 hover:shadow-[0_0_20px_hsl(43_80%_50%/0.4),0_0_35px_hsl(43_80%_50%/0.2)]",
        // Active/tap state - subtle scale
        "active:scale-[0.98]"
      )}
      style={{
        // Metallic gold ring gradient
        background: 'linear-gradient(145deg, hsl(43 75% 55%) 0%, hsl(40 70% 45%) 50%, hsl(35 65% 30%) 100%)',
      }}
    >
      {/* Inner dark fill */}
      <div className={cn(
        "absolute inset-[2px] rounded-full",
        "bg-gradient-to-b from-[hsl(30_10%_12%)] via-[hsl(30_8%_8%)] to-[hsl(30_8%_6%)]"
      )} />
      
      {/* Inner gold ring accent */}
      <div className="absolute inset-[3px] rounded-full border border-gold/20" />
      
      {/* Specular highlight on top */}
      <div className="absolute inset-[3px] rounded-full overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-x-0 top-0 h-1/3 opacity-10"
          style={{
            background: 'linear-gradient(180deg, hsl(0 0% 100% / 0.3) 0%, transparent 100%)',
          }}
        />
      </div>
      
      {/* Button content */}
      <span 
        className="relative z-10 text-center font-bold text-sm sm:text-base tracking-wide uppercase"
        style={{
          background: 'linear-gradient(180deg, hsl(45 80% 70%) 0%, hsl(40 75% 50%) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 1px 1px hsl(0 0% 0% / 0.3))',
        }}
      >
        {label}
      </span>
    </button>
  );
}

interface NavigationButtonsProps {
  onReviewsClick: () => void;
  onAboutClick: () => void;
  onMediaClick: () => void;
}

export function NavigationButtons({ onReviewsClick, onAboutClick, onMediaClick }: NavigationButtonsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 py-10 md:py-14">
      <NavButton label="Reviews" onClick={onReviewsClick} />
      <NavButton label="About Us" onClick={onAboutClick} />
      <NavButton label="Media" onClick={onMediaClick} />
    </div>
  );
}
