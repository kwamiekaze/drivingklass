import { useTheme } from "@/components/ThemeProvider";

export function ThemeDebugBadge() {
  const { resolvedTheme } = useTheme();

  // Preview only (not in production builds)
  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-3 right-3 z-[9999] select-none rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
      Theme Debug: <span className="font-semibold">{resolvedTheme}</span>
    </div>
  );
}
