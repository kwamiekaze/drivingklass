import { useTheme } from "@/components/ThemeProvider";
import { DarkModeBackground } from "@/components/DarkModeBackground";
import { LightModeBackground } from "@/components/LightModeBackground";

/**
 * Fixed full-viewport theme background used across portal pages.
 * Mirrors the pattern in StudentDashboard for consistent hero video visuals.
 */
export function PortalBackground() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="fixed inset-0 -z-10" style={{ pointerEvents: "none" }}>
      {isDark ? (
        <>
          <div
            className="absolute inset-0 transition-colors duration-500"
            style={{
              background:
                "linear-gradient(180deg, hsl(30 15% 4%) 0%, hsl(0 0% 2%) 30%, hsl(0 0% 1%) 100%)",
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 35%, hsl(40 80% 30% / 0.12) 0%, transparent 60%)",
            }}
          />
          <DarkModeBackground />
        </>
      ) : (
        <LightModeBackground />
      )}
    </div>
  );
}
