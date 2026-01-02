import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Theme = "dark" | "light";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: Theme;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);

function getThemeColor(theme: Theme) {
  // Keep these in sync with the design tokens (index.css)
  return theme === "dark" ? "hsl(30 10% 3%)" : "hsl(200 70% 88%)";
}

function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

/**
 * Applies theme to document:
 * - Sets data-theme attribute (CSS variable source of truth)
 * - Toggles .dark class (Tailwind dark: variants)
 * - Updates meta[name="theme-color"]
 * - Persists to localStorage
 */
function applyTheme(theme: Theme, storageKey: string) {
  const root = document.documentElement;

  // Single source of truth: data-theme attribute
  root.dataset.theme = theme;
  
  // For Tailwind dark: variants compatibility
  root.classList.remove("dark", "light");
  root.classList.add(theme);

  // Persist choice - user preference always wins
  localStorage.setItem(storageKey, theme);

  // Update meta theme-color for browser chrome
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", getThemeColor(theme));
  }
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Priority: 1) DOM (from inline script), 2) localStorage, 3) default
    if (typeof document !== "undefined") {
      const fromDom = document.documentElement.dataset.theme;
      if (isTheme(fromDom)) return fromDom;
    }

    if (typeof localStorage !== "undefined") {
      const fromStorage = localStorage.getItem(storageKey);
      if (isTheme(fromStorage)) return fromStorage;
    }

    return defaultTheme;
  });

  // Apply theme on mount and whenever it changes
  useEffect(() => {
    applyTheme(theme, storageKey);
  }, [theme, storageKey]);

  const value = useMemo<ThemeProviderState>(
    () => ({
      theme,
      resolvedTheme: theme,
      setTheme: (next) => {
        setThemeState(next);
      },
    }),
    [theme]
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
