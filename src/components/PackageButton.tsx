import { cn } from "@/lib/utils";

interface PackageButtonProps {
  label: string;
  isSelected: boolean;
  isHighlighted?: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}

export function PackageButton({ 
  label, 
  isSelected, 
  isHighlighted = false,
  onClick, 
  style,
}: PackageButtonProps) {
  const isActive = isSelected || isHighlighted;

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
        "active:scale-[0.96]",
        // Z-index for topmost layer
        "z-30"
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
      
      {/* Button content - label always visible above all effects */}
      <span 
        className={cn(
          "relative z-20 text-center leading-tight font-bold pointer-events-none",
          "text-[10px] sm:text-xs md:text-sm lg:text-base",
          "px-1 whitespace-pre-line"
        )}
        style={{
          color: isActive ? 'hsl(48 90% 75%)' : 'hsl(45 80% 65%)',
          textShadow: '0 1px 2px hsl(0 0% 0% / 0.5), 0 0 8px hsl(43 80% 50% / 0.3)',
        }}
      >
        {label}
      </span>
    </button>
  );
}
