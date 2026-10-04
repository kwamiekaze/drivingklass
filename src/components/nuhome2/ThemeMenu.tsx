import { Clock, Laptop, Moon, Smartphone, Sun } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTheme, type ThemePreference } from "@/components/ThemeProvider";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePortalAuth } from "@/hooks/usePortalAuth";

/** The homepage's theme menu, option for option: Light and Dark for everyone, Auto (System) and Time-based for admins. Same analytics event. */
export function ThemeMenu({ night }: { night: boolean }) {
  const { theme, setTheme } = useTheme();
  const { trackClick } = useAnalytics();
  const isMobile = useIsMobile();
  let isAdmin = false;
  try { isAdmin = usePortalAuth().role === "admin"; } catch { isAdmin = false; }
  const SystemIcon = isMobile ? Smartphone : Laptop;
  const pick = (t: ThemePreference) => { trackClick("theme_toggle", { theme: t }); setTheme(t); };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="n2-hdr-btn" aria-label="Toggle theme">
          {isAdmin && theme === "time-based" ? <Clock size={20} aria-hidden="true" /> : isAdmin && theme === "system" ? <SystemIcon size={20} aria-hidden="true" /> : night ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="n2-theme-menu">
        <DropdownMenuItem onClick={() => pick("light")}><Sun className="mr-2 h-4 w-4" />Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => pick("dark")}><Moon className="mr-2 h-4 w-4" />Dark</DropdownMenuItem>
        {isAdmin && <>
          <DropdownMenuItem onClick={() => pick("system")}><SystemIcon className="mr-2 h-4 w-4" />Auto (System)</DropdownMenuItem>
          <DropdownMenuItem onClick={() => pick("time-based")}><Clock className="mr-2 h-4 w-4" />Time-based (7AM-6PM)</DropdownMenuItem>
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
