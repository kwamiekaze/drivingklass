import { useTheme } from "@/components/ThemeProvider";

export function ThemeDebugBadge() {
  const { resolvedTheme } = useTheme();

  // Preview only (not in production builds)
  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed top-3 left-16 z-[9999] select-none rounded-full border border-border bg-card/90 px-3 py-1 text-xs font-semibold text-foreground shadow-md backdrop-blur-sm">
      Theme: <span className="uppercase tracking-wide">{resolvedTheme}</span>
    </div>
  );
}
