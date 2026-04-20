"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type ThemePreference = Theme | "system";

interface ThemeContextValue {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "theme-preference";

// ✅ Verifica se está no browser antes de acessar APIs do cliente
const isBrowser = typeof window !== "undefined";

const getSystemTheme = (): Theme => {
  if (!isBrowser) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const resolveTheme = (preference: ThemePreference): Theme => {
  if (preference === "system") return getSystemTheme();
  return preference;
};

const getInitialPreference = (): ThemePreference => {
  if (!isBrowser) return "system"; // ✅ SSR: retorna padrão sem acessar localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(getInitialPreference);
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(getInitialPreference()));

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!isBrowser) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (preference !== "system") return;
      setTheme(getSystemTheme());
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, [preference]);

  const setPreference = (value: ThemePreference) => {
    setPreferenceState(value);
    if (value === "system") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, value);
    }
    setTheme(resolveTheme(value));
  };

  const toggleTheme = () => {
    setPreference(theme === "dark" ? "light" : "dark");
  };

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme precisa ser usado dentro de ThemeProvider.");
  return context;
}