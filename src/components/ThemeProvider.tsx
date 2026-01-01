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
  return theme === "dark" ? "hsl(30 10% 3%)" : "hsl(42 45% 96%)";
}

function isTheme(value: unknown): value is Theme {
  return value === "dark" || value === "light";
}

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Prefer the pre-init script value to prevent flashes.
    const fromDom = document.documentElement.dataset.theme;
    if (isTheme(fromDom)) return fromDom;

    const fromStorage = localStorage.getItem(storageKey);
    if (isTheme(fromStorage)) return fromStorage;

    return defaultTheme;
  });

  const applyTheme = (next: Theme) => {
    const root = document.documentElement;

    root.dataset.theme = next;
    root.classList.toggle("dark", next === "dark");

    localStorage.setItem(storageKey, next);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", getThemeColor(next));
  };

  useEffect(() => {
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const value = useMemo<ThemeProviderState>(
    () => ({
      theme,
      resolvedTheme: theme,
      setTheme: (next) => setThemeState(next),
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
