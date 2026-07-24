import { cn } from "@/lib/utils";
import { Phone } from "lucide-react";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GoldPillProps {
  label: string;
  onClick: () => void;
  ariaLabel?: string;
  icon?: React.ReactNode;
  shimmerDelay?: string;
}

function GoldPill({ label, onClick, ariaLabel, icon, shimmerDelay }: GoldPillProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={cn(
        "gold-pill gold-pill-shimmer",
        "relative inline-flex items-center justify-center gap-2",
        "px-6 py-2.5 sm:px-8 sm:py-3 rounded-full select-none",
        "transition-all duration-200 ease-out",
        "hover:scale-[1.03] active:scale-95"
      )}
      style={shimmerDelay ? ({ ["--shimmer-delay" as any]: shimmerDelay, animationDelay: shimmerDelay } as React.CSSProperties) : undefined}
    >
      {icon}
      <span
        className="gold-pill-label relative z-10 font-bold text-sm sm:text-base uppercase"
        style={{ letterSpacing: "0.18em" }}
      >
        {label}
      </span>
    </button>
  );
}

interface NavigationButtonsProps {
  onReviewsClick: () => void;
  onAboutClick: () => void;
  /** When true, render absolutely positioned over the hero (light theme). */
  overlay?: boolean;
}

export function NavigationButtons({ onReviewsClick, onAboutClick, overlay = false }: NavigationButtonsProps) {
  const { trackClick } = useAnalytics();
  const handleCall = () => {
    trackClick("call_click");
    window.location.href = "tel:+14044045820";
  };

  const row = (
    <div
      className={cn(
        "flex flex-nowrap justify-center items-center gap-4 sm:gap-6",
        overlay ? "px-3" : "py-10 md:py-14 px-3 flex-wrap"
      )}
    >
      <GoldPill label="Reviews" onClick={onReviewsClick} shimmerDelay="0s" />
      <GoldPill label="About Us" onClick={onAboutClick} shimmerDelay="1.2s" />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <GoldPill
                label="Call"
                ariaLabel="Call Driving Klass"
                onClick={handleCall}
                shimmerDelay="2.4s"
                icon={<Phone className="relative z-10 w-4 h-4 sm:w-5 sm:h-5" style={{ stroke: "hsl(43 85% 60%)", filter: "drop-shadow(0 1px 1px hsl(0 0% 0% / 0.4))" }} />}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-background/95 border-primary/20 text-foreground">
            <p>Call Driving Klass</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );

  return row;
}
