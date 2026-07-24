import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";
import { Phone } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavButtonProps {
  label: string;
  onClick: () => void;
}

function NavButton({ label, onClick }: NavButtonProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center",
        "px-6 py-3 sm:px-8 sm:py-3.5",
        "rounded-full cursor-pointer select-none",
        "transition-all duration-200 ease-out",
        "p-[2px]",
        // Theme-aware glow
        isDark 
          ? "shadow-[0_0_12px_hsl(43_80%_50%/0.25),0_0_24px_hsl(43_80%_50%/0.1)]"
          : "shadow-[0_4px_18px_hsl(0_0%_0%/0.1),0_0_22px_hsl(43_75%_50%/0.25)]",
        // Hover state
        isDark
          ? "hover:brightness-110 hover:shadow-[0_0_20px_hsl(43_80%_50%/0.4),0_0_35px_hsl(43_80%_50%/0.2)]"
          : "hover:shadow-[0_6px_24px_hsl(0_0%_0%/0.12),0_0_28px_hsl(43_75%_50%/0.35)]",
        // Active/tap state
        "active:scale-[0.96]"
      )}
      style={{
        // Metallic gold ring gradient - same for both themes
        background: 'linear-gradient(145deg, hsl(43 75% 55%) 0%, hsl(40 70% 45%) 50%, hsl(35 65% 30%) 100%)',
      }}
    >
      {/* Inner fill - charcoal for contrast in both themes */}
      <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-[hsl(30_10%_14%)] via-[hsl(30_8%_10%)] to-[hsl(30_8%_7%)]" />
      
      {/* Inner gold ring accent */}
      <div className="absolute inset-[3px] rounded-full border border-[hsl(43_75%_55%/0.3)]" />
      
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
          background: 'linear-gradient(180deg, hsl(48 85% 72%) 0%, hsl(43 80% 55%) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 1px 1px hsl(0 0% 0% / 0.4))',
        }}
      >
        {label}
      </span>
    </button>
  );
}

function CallButton() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const { trackClick } = useAnalytics();

  const handleCall = () => {
    trackClick("call_click");
    window.location.href = "tel:+14044045820";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCall}
            aria-label="Call Driving Klass"
            className={cn(
              "relative flex items-center justify-center gap-2",
              "px-6 py-3 sm:px-8 sm:py-3.5",
              "rounded-full cursor-pointer select-none",
              "transition-all duration-200 ease-out",
              "p-[2px]",
              // Theme-aware glow
              isDark 
                ? "shadow-[0_0_12px_hsl(43_80%_50%/0.25),0_0_24px_hsl(43_80%_50%/0.1)]"
                : "shadow-[0_4px_18px_hsl(0_0%_0%/0.1),0_0_22px_hsl(43_75%_50%/0.25)]",
              // Hover state with gold glow pulse
              isDark
                ? "hover:brightness-110 hover:shadow-[0_0_20px_hsl(43_80%_50%/0.5),0_0_40px_hsl(43_80%_50%/0.3)]"
                : "hover:shadow-[0_6px_24px_hsl(0_0%_0%/0.12),0_0_32px_hsl(43_75%_50%/0.4)]",
              // Active/tap state - scale down
              "active:scale-[0.94]"
            )}
            style={{
              // Metallic gold ring gradient - same for both themes
              background: 'linear-gradient(145deg, hsl(43 75% 55%) 0%, hsl(40 70% 45%) 50%, hsl(35 65% 30%) 100%)',
            }}
          >
            {/* Inner fill - charcoal for contrast in both themes */}
            <div className="absolute inset-[2px] rounded-full bg-gradient-to-b from-[hsl(30_10%_14%)] via-[hsl(30_8%_10%)] to-[hsl(30_8%_7%)]" />
            
            {/* Inner gold ring accent */}
            <div className="absolute inset-[3px] rounded-full border border-[hsl(43_75%_55%/0.3)]" />
            
            {/* Specular highlight on top */}
            <div className="absolute inset-[3px] rounded-full overflow-hidden pointer-events-none">
              <div 
                className="absolute inset-x-0 top-0 h-1/3 opacity-10"
                style={{
                  background: 'linear-gradient(180deg, hsl(0 0% 100% / 0.3) 0%, transparent 100%)',
                }}
              />
            </div>
            
            {/* Button content with icon - phone icon only in dark mode */}
            {isDark && (
              <Phone 
                className="relative z-10 w-4 h-4 sm:w-5 sm:h-5"
                style={{
                  stroke: 'hsl(43 80% 55%)',
                  filter: 'drop-shadow(0 1px 1px hsl(0 0% 0% / 0.4))',
                }}
              />
            )}
            <span 
              className="relative z-10 text-center font-bold text-sm sm:text-base tracking-wide uppercase"
              style={{
                background: 'linear-gradient(180deg, hsl(48 85% 72%) 0%, hsl(43 80% 55%) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 1px 1px hsl(0 0% 0% / 0.4))',
              }}
            >
              Call
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="bg-background/95 border-primary/20 text-foreground"
        >
          <p>Call Driving Klass</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface NavigationButtonsProps {
  onReviewsClick: () => void;
  onAboutClick: () => void;
}

export function NavigationButtons({ onReviewsClick, onAboutClick }: NavigationButtonsProps) {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  return (
    <div
      className={cn(
        "flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6",
        // Light theme mobile: fix to bottom of viewport (~90%) over the steering wheel
        // area of the road video. Desktop / dark unchanged.
        isLight
          ? "fixed left-0 right-0 z-40 px-4 py-3 md:static md:py-14 md:px-0"
          : "py-10 md:py-14"
      )}
      style={
        isLight
          ? { bottom: 'max(env(safe-area-inset-bottom), 12px)' }
          : undefined
      }
    >
      <NavButton label="Reviews" onClick={onReviewsClick} />
      <NavButton label="About Us" onClick={onAboutClick} />
      <CallButton />
    </div>
  );
}

