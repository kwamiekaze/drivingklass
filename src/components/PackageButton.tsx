import { cn } from "@/lib/utils";

interface PackageButtonProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}

export function PackageButton({ label, isSelected, onClick, style }: PackageButtonProps) {
  return (
    <button
      onClick={onClick}
      style={style}
      className={cn(
        "absolute flex items-center justify-center",
        "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24",
        "rounded-full cursor-pointer select-none",
        "transition-all duration-300 ease-out",
        // Base styling - themed for light/dark
        "bg-card border-2 border-gold",
        // Glow effect
        "shadow-[0_0_15px_hsl(var(--gold)/0.3),0_0_30px_hsl(var(--gold)/0.1)]",
        // Hover state
        "hover:scale-110 hover:shadow-[0_0_25px_hsl(var(--gold)/0.5),0_0_50px_hsl(var(--gold)/0.2)]",
        // Active/tap state
        "active:scale-95",
        // Selected state
        isSelected && [
          "border-gold-light border-[3px]",
          "shadow-[0_0_30px_hsl(var(--gold)/0.6),0_0_60px_hsl(var(--gold)/0.3)]",
          "scale-105",
        ]
      )}
    >
      {/* Inner gold ring effect */}
      <div className={cn(
        "absolute inset-1 rounded-full",
        "border border-gold/30",
        isSelected && "border-gold/50"
      )} />
      
      {/* Button content */}
      <span className={cn(
        "relative z-10 text-center leading-tight font-bold",
        "text-[10px] sm:text-xs md:text-sm lg:text-base",
        "text-gold dark:text-gold-light",
        "px-1",
        isSelected && "text-gold-shimmer"
      )}>
        {label}
      </span>
    </button>
  );
}
