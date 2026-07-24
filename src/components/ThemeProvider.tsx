import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "dark" | "light";
export type ThemePreference = "dark" | "light" | "system" | "time-based";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: ThemePreference;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  resolvedTheme: Theme;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);

function getThemeColor(theme: Theme) {
  // Keep these in sync with the design tokens (index.css)
  return theme === "dark" ? "hsl(30 10% 3%)" : "hsl(200 70% 88%)";
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "dark" || value === "light" || value === "system" || value === "time-based";
}

function getSystemTheme(): Theme | null {
  if (typeof window !== "undefined" && window.matchMedia) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    // Some environments return a MediaQueryList that never matches anything meaningful;
    // trust it when matchMedia is present.
    return mq.matches ? "dark" : "light";
  }
  return null;
}

/**
 * Time-based theme using GEORGIA time (America/New_York):
 * Light 7:00 AM – 7:00 PM, Dark otherwise.
 */
function getTimeBasedTheme(): Theme {
  try {
    const hourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).format(new Date());
    const hour = parseInt(hourStr, 10);
    if (!Number.isNaN(hour) && hour >= 7 && hour < 19) return "light";
    return "dark";
  } catch {
    const hour = new Date().getHours();
    return hour >= 7 && hour < 19 ? "light" : "dark";
  }
}

function resolveTheme(preference: ThemePreference): Theme {
  if (preference === "system") {
    return getSystemTheme() ?? getTimeBasedTheme();
  }
  if (preference === "time-based") {
    return getTimeBasedTheme();
  }
  return preference;
}

/**
 * Applies theme to document:
 * - Sets data-theme attribute (CSS variable source of truth)
 * - Toggles .dark class (Tailwind dark: variants)
 * - Updates meta[name="theme-color"]
 */
function applyTheme(theme: Theme) {
  const root = document.documentElement;

  // Single source of truth: data-theme attribute
  root.dataset.theme = theme;
  
  // For Tailwind dark: variants compatibility
  root.classList.remove("dark", "light");
  root.classList.add(theme);

  // Update meta theme-color for browser chrome
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", getThemeColor(theme));
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "system", // Default to system (Auto) - follows device preference
  storageKey = "theme",
}: ThemeProviderProps) {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    // Priority: 1) localStorage (user's explicit choice), 2) default to 'system' (Auto)
    if (typeof localStorage !== "undefined") {
      const fromStorage = localStorage.getItem(storageKey);
      if (isThemePreference(fromStorage)) return fromStorage;
    }
    return defaultTheme;
  });

  const resolvedTheme = useMemo(() => resolveTheme(themePreference), [themePreference]);

  // Apply theme on mount and whenever it changes
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system theme changes when preference is 'system'
  useEffect(() => {
    if (themePreference !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    const handleChange = () => {
      applyTheme(getSystemTheme() ?? getTimeBasedTheme());
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [themePreference]);

  // Check time-based theme every minute when preference is 'time-based'
  useEffect(() => {
    if (themePreference !== "time-based") return;

    const checkAndApply = () => {
      applyTheme(getTimeBasedTheme());
    };

    // Check immediately
    checkAndApply();

    // Check every minute
    const interval = setInterval(checkAndApply, 60 * 1000);
    return () => clearInterval(interval);
  }, [themePreference]);

  const value = useMemo<ThemeProviderState>(
    () => ({
      theme: themePreference,
      resolvedTheme,
      setTheme: (next) => {
        setThemePreference(next);
        // Persist choice - user preference always wins
        localStorage.setItem(storageKey, next);
      },
    }),
    [themePreference, resolvedTheme, storageKey]
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (!context)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};
