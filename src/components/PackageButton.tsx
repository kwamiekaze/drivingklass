import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

interface PackageButtonProps {
  label: string;
  isSelected: boolean;
  isHighlighted?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  style?: React.CSSProperties;
}

export function PackageButton({ 
  label, 
  isSelected, 
  isHighlighted = false,
  onClick, 
  onMouseEnter,
  onMouseLeave,
  style,
}: PackageButtonProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isActive = isSelected || isHighlighted;

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        ...style,
        // Metallic gold ring gradient - consistent across themes
        background: isActive 
          ? 'linear-gradient(145deg, hsl(48 85% 65%) 0%, hsl(43 80% 50%) 50%, hsl(38 75% 35%) 100%)'
          : 'linear-gradient(145deg, hsl(43 75% 55%) 0%, hsl(40 70% 45%) 50%, hsl(35 65% 30%) 100%)',
        // Ensure button content is never clipped
        position: 'absolute',
        overflow: 'visible',
      }}
      className={cn(
        "flex items-center justify-center",
        "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24",
        "rounded-full cursor-pointer select-none",
        "transition-all duration-200 ease-out",
        // Thicker padding for selected state - ring glow only, no overlay
        isSelected ? "p-[3px] sm:p-[4px]" : "p-[2px] sm:p-[3px]",
        // Glow - theme aware with orange accent in light mode
        isDark ? (
          isSelected 
            ? "shadow-[0_0_25px_hsl(43_80%_50%/0.6),0_0_45px_hsl(43_80%_50%/0.3)]"
            : isHighlighted
            ? "shadow-[0_0_18px_hsl(43_80%_50%/0.4),0_0_30px_hsl(43_80%_50%/0.15)]"
            : "shadow-[0_0_12px_hsl(43_80%_50%/0.25),0_0_24px_hsl(43_80%_50%/0.1)]"
        ) : (
          isSelected 
            ? "shadow-[0_0_25px_hsl(43_74%_49%/0.5),0_0_45px_hsl(43_74%_49%/0.25),0_0_15px_hsl(28_100%_55%/0.2)]"
            : isHighlighted
            ? "shadow-[0_0_18px_hsl(43_74%_49%/0.35),0_0_30px_hsl(43_74%_49%/0.15)]"
            : "shadow-[0_4px_16px_hsl(0_0%_0%/0.15),0_0_20px_hsl(43_74%_49%/0.2)]"
        ),
        // Hover state - gentle brightness
        "hover:brightness-110",
        // Active/tap state - subtle scale
        "active:scale-[0.96]",
        // Z-index for topmost layer
        "z-30"
      )}
    >
      {/* Inner dark fill - matte charcoal for both themes */}
      <div 
        className={cn(
          "absolute rounded-full pointer-events-none",
          isSelected ? "inset-[3px] sm:inset-[4px]" : "inset-[2px] sm:inset-[3px]",
          // Charcoal interior - same for both themes for contrast
          "bg-gradient-to-b from-[hsl(30_10%_14%)] via-[hsl(30_8%_10%)] to-[hsl(30_8%_7%)]"
        )}
        style={{ zIndex: 0 }}
      />
      
      {/* Inner gold ring accent - pointer-events-none so it doesn't block */}
      <div 
        className={cn(
          "absolute rounded-full border pointer-events-none",
          isSelected 
            ? "inset-[4px] sm:inset-[5px] border-gold/50" 
            : "inset-[3px] sm:inset-[4px] border-gold/20",
          isHighlighted && !isSelected && "border-gold/35"
        )}
        style={{ zIndex: 1 }}
      />
      
      {/* Specular highlight on top - low opacity, never covers text */}
      <div 
        className={cn(
          "absolute rounded-full overflow-hidden pointer-events-none",
          isSelected ? "inset-[4px] sm:inset-[5px]" : "inset-[3px] sm:inset-[4px]"
        )}
        style={{ zIndex: 1, opacity: isActive ? 0.1 : 0.05 }}
      >
        <div 
          className="absolute inset-x-0 top-0 h-1/3 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, hsl(0 0% 100% / 0.25) 0%, transparent 100%)',
          }}
        />
      </div>
      
      {/* Button content - label ALWAYS visible above all effects */}
      <span 
        className={cn(
          "relative text-center leading-tight font-bold pointer-events-none font-display tracking-wide",
          "text-[10px] sm:text-xs md:text-sm lg:text-base",
          "px-1 whitespace-pre-line"
        )}
        style={{
          zIndex: 10,
          position: 'relative',
          color: isActive ? 'hsl(48 90% 75%)' : 'hsl(45 80% 65%)',
          textShadow: '0 1px 2px hsl(0 0% 0% / 0.7), 0 0 8px hsl(43 80% 50% / 0.4)',
        }}
      >
        {label}
      </span>
    </button>
  );
}