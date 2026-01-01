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
      style={{
        ...style,
        // Metallic gold ring gradient
        background: isSelected 
          ? 'linear-gradient(145deg, hsl(48 85% 65%) 0%, hsl(43 80% 50%) 50%, hsl(38 75% 35%) 100%)'
          : 'linear-gradient(145deg, hsl(43 75% 55%) 0%, hsl(40 70% 45%) 50%, hsl(35 65% 30%) 100%)',
      }}
      className={cn(
        "absolute flex items-center justify-center",
        "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24",
        "rounded-full cursor-pointer select-none",
        "transition-all duration-200 ease-out",
        "p-[2px] sm:p-[3px]",
        // Subtle glow - controlled, not neon
        isSelected 
          ? "shadow-[0_0_20px_hsl(43_80%_50%/0.5),0_0_40px_hsl(43_80%_50%/0.2)]"
          : "shadow-[0_0_12px_hsl(43_80%_50%/0.25),0_0_24px_hsl(43_80%_50%/0.1)]",
        // Hover state - gentle brightness
        "hover:brightness-110",
        // Active/tap state - subtle scale
        "active:scale-[0.96]"
      )}
    >
      {/* Inner dark fill */}
      <div className={cn(
        "absolute inset-[2px] sm:inset-[3px] rounded-full",
        "bg-gradient-to-b from-[hsl(30_10%_12%)] via-[hsl(30_8%_8%)] to-[hsl(30_8%_6%)]",
        "dark:from-[hsl(30_10%_10%)] dark:via-[hsl(30_8%_6%)] dark:to-[hsl(30_8%_4%)]",
        // Light mode inner fill
        "light:from-[hsl(40_25%_95%)] light:via-[hsl(40_20%_92%)] light:to-[hsl(40_15%_88%)]"
      )} />
      
      {/* Inner gold ring accent */}
      <div className={cn(
        "absolute inset-[3px] sm:inset-[4px] rounded-full",
        "border border-gold/20",
        isSelected && "border-gold/40"
      )} />
      
      {/* Specular highlight on top */}
      <div className="absolute inset-[3px] sm:inset-[4px] rounded-full overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-x-0 top-0 h-1/3 opacity-10"
          style={{
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
          background: isSelected
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
    </button>
  );
}
