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

function getSystemTheme(): Theme {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
}

/**
 * Time-based theme: Light from 7:00 AM to 6:00 PM, Dark otherwise
 */
function getTimeBasedTheme(): Theme {
  const now = new Date();
  const hour = now.getHours();
  // Light theme: 7:00 AM (7) to 6:00 PM (18)
  if (hour >= 7 && hour < 18) {
    return "light";
  }
  return "dark";
}

function resolveTheme(preference: ThemePreference): Theme {
  if (preference === "system") {
    return getSystemTheme();
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
  defaultTheme = "time-based", // Default to time-based
  storageKey = "theme",
}: ThemeProviderProps) {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    // Priority: 1) localStorage (user's explicit choice), 2) default to 'time-based'
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
      applyTheme(getSystemTheme());
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
