import { Moon, Sun, Clock, Smartphone, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, ThemePreference } from "@/components/ThemeProvider";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { trackClick } = useAnalytics();
  const isMobile = useIsMobile();
  
  // Get role - will be null if not logged in or context not available
  let isAdmin = false;
  try {
    const { role } = usePortalAuth();
    isAdmin = role === 'admin';
  } catch {
    // Not inside PortalAuthProvider - treat as non-admin
    isAdmin = false;
  }

  const handleThemeChange = (newTheme: ThemePreference) => {
    trackClick("theme_toggle", { theme: newTheme });
    setTheme(newTheme);
  };

  // System icon changes based on device type
  const SystemIcon = isMobile ? Smartphone : Laptop;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full border border-gold/30 bg-background/50 backdrop-blur-sm hover:bg-gold/10 hover:border-gold/50 transition-all duration-300"
        >
          {theme === "time-based" ? (
            <Clock className="h-5 w-5 text-gold" />
          ) : theme === "system" ? (
            <SystemIcon className="h-5 w-5 text-gold" />
          ) : (
            <>
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all text-gold dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all text-gold dark:rotate-0 dark:scale-100" />
            </>
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleThemeChange("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        {/* Admin-only options */}
        {isAdmin && (
          <>
            <DropdownMenuItem onClick={() => handleThemeChange("system")}>
              <SystemIcon className="mr-2 h-4 w-4" />
              Auto (System)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange("time-based")}>
              <Clock className="mr-2 h-4 w-4" />
              Time-based (7AM-6PM)
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
