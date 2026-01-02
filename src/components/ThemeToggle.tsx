import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { useAnalytics } from "@/hooks/useAnalytics";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { trackClick } = useAnalytics();

  const toggleTheme = () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark";
    trackClick("theme_toggle", { theme: newTheme });
    setTheme(newTheme);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative h-10 w-10 rounded-full border border-gold/30 bg-background/50 backdrop-blur-sm hover:bg-gold/10 hover:border-gold/50 transition-all duration-300"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all text-gold dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all text-gold dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
