import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useAnalytics } from "@/hooks/useAnalytics";

/** One tap flips day and night. No menu, no words: it simply switches to the theme that is not showing. */
export function ThemeToggle({ size = "md" }: { size?: "md" | "lg" } = {}) {
  const { resolvedTheme, setTheme } = useTheme();
  const { trackClick } = useAnalytics();
  const isLg = size === "lg";
  const night = resolvedTheme === "dark";

  const btnClass = isLg
    ? "relative inline-flex items-center justify-center p-2.5 rounded-full border border-gold/30 bg-card/40 backdrop-blur-sm hover:bg-gold/10 hover:border-gold/60 transition-all duration-300 shadow-[0_0_18px_rgba(0,0,0,0.35)]"
    : "relative inline-flex items-center justify-center h-10 w-10 rounded-full border border-gold/30 bg-background/50 backdrop-blur-sm hover:bg-gold/10 hover:border-gold/60 transition-all duration-300";
  const iconClass = isLg ? "w-11 h-11 text-gold" : "h-5 w-5 text-gold";

  return (
    <button
      type="button"
      aria-label={night ? "Switch to day" : "Switch to night"}
      className={btnClass}
      onClick={() => { const next = night ? "light" : "dark"; trackClick("theme_toggle", { theme: next }); setTheme(next); }}
    >
      {night ? <Sun className={iconClass} /> : <Moon className={iconClass} />}
    </button>
  );
}
