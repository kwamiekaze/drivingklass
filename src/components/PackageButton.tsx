import { cn } from "@/lib/utils";

interface PackageButtonProps {
  label: string;
  price?: string;
  isSelected: boolean;
  isHighlighted?: boolean;
  showPrice?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
  pricePosition?: 'top' | 'bottom' | 'left' | 'right';
}

export function PackageButton({ 
  label, 
  price,
  isSelected, 
  isHighlighted = false,
  showPrice = false,
  onClick, 
  style,
  pricePosition = 'right',
}: PackageButtonProps) {
  const isActive = isSelected || isHighlighted;
  
  // Calculate price label position based on button angle
  const getPricePositionStyles = (): React.CSSProperties => {
    switch (pricePosition) {
      case 'top':
        return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '4px' };
      case 'bottom':
        return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '4px' };
      case 'left':
        return { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '6px' };
      case 'right':
      default:
        return { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '6px' };
    }
  };

  return (
    <button
      onClick={onClick}
      style={{
        ...style,
        // Metallic gold ring gradient
        background: isActive 
          ? 'linear-gradient(145deg, hsl(48 85% 65%) 0%, hsl(43 80% 50%) 50%, hsl(38 75% 35%) 100%)'
          : 'linear-gradient(145deg, hsl(43 75% 55%) 0%, hsl(40 70% 45%) 50%, hsl(35 65% 30%) 100%)',
      }}
      className={cn(
        "absolute flex items-center justify-center",
        "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24",
        "rounded-full cursor-pointer select-none",
        "transition-all duration-200 ease-out",
        // Thicker padding for selected state
        isSelected ? "p-[3px] sm:p-[4px]" : "p-[2px] sm:p-[3px]",
        // Glow - stronger for selected, subtle pulse for highlighted
        isSelected 
          ? "shadow-[0_0_25px_hsl(43_80%_50%/0.6),0_0_45px_hsl(43_80%_50%/0.3)]"
          : isHighlighted
          ? "shadow-[0_0_18px_hsl(43_80%_50%/0.4),0_0_30px_hsl(43_80%_50%/0.15)]"
          : "shadow-[0_0_12px_hsl(43_80%_50%/0.25),0_0_24px_hsl(43_80%_50%/0.1)]",
        // Hover state - gentle brightness
        "hover:brightness-110",
        // Active/tap state - subtle scale
        "active:scale-[0.96]"
      )}
    >
      {/* Inner dark fill */}
      <div className={cn(
        "absolute rounded-full",
        isSelected ? "inset-[3px] sm:inset-[4px]" : "inset-[2px] sm:inset-[3px]",
        "bg-gradient-to-b from-[hsl(30_10%_12%)] via-[hsl(30_8%_8%)] to-[hsl(30_8%_6%)]",
        "dark:from-[hsl(30_10%_10%)] dark:via-[hsl(30_8%_6%)] dark:to-[hsl(30_8%_4%)]"
      )} />
      
      {/* Inner gold ring accent */}
      <div className={cn(
        "absolute rounded-full border",
        isSelected ? "inset-[4px] sm:inset-[5px] border-gold/50" : "inset-[3px] sm:inset-[4px] border-gold/20",
        isHighlighted && !isSelected && "border-gold/35"
      )} />
      
      {/* Specular highlight on top */}
      <div className={cn(
        "absolute rounded-full overflow-hidden pointer-events-none",
        isSelected ? "inset-[4px] sm:inset-[5px]" : "inset-[3px] sm:inset-[4px]"
      )}>
        <div 
          className="absolute inset-x-0 top-0 h-1/3"
          style={{
            opacity: isActive ? 0.15 : 0.1,
            background: 'linear-gradient(180deg, hsl(0 0% 100% / 0.3) 0%, transparent 100%)',
          }}
        />
      </div>
      
      {/* Button content */}
      <span 
        className={cn(
          "relative z-10 text-center leading-tight font-bold",
          "text-[10px] sm:text-xs md:text-sm lg:text-base",
          "px-1 whitespace-pre-line"
        )}
        style={{
          background: isActive
            ? 'linear-gradient(180deg, hsl(48 90% 78%) 0%, hsl(43 85% 60%) 100%)'
            : 'linear-gradient(180deg, hsl(45 80% 70%) 0%, hsl(40 75% 50%) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 1px 1px hsl(0 0% 0% / 0.3))',
        }}
      >
        {label}
      </span>

      {/* Price label - shown only when selected */}
      {showPrice && price && (
        <div 
          className="absolute whitespace-nowrap z-20 animate-scale-in"
          style={getPricePositionStyles()}
        >
          <span 
            className="px-2 py-1 rounded-md text-xs sm:text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, hsl(30 10% 8% / 0.95) 0%, hsl(25 8% 5% / 0.95) 100%)',
              border: '1px solid hsl(43 60% 40% / 0.5)',
              color: 'hsl(43 85% 60%)',
              boxShadow: '0 2px 10px hsl(0 0% 0% / 0.4), 0 0 15px hsl(43 80% 52% / 0.2)',
            }}
          >
            {price}
          </span>
        </div>
      )}
    </button>
  );
}
