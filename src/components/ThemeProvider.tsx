import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "dark" | "light";
export type ThemePreference = "dark" | "light" | "system";

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
  return value === "dark" || value === "light" || value === "system";
}

function getSystemTheme(): Theme {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark";
}

function resolveTheme(preference: ThemePreference): Theme {
  if (preference === "system") {
    return getSystemTheme();
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
  defaultTheme = "system",
  storageKey = "theme",
}: ThemeProviderProps) {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    // Priority: 1) localStorage (user's explicit choice), 2) default to 'system'
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
