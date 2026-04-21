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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setPreference = (_value: ThemePreference) => {
    // Tema fixo em dark: mantém API sem permitir alternância visual.
    setPreferenceState("dark");
    setTheme("dark");
    if (isBrowser) localStorage.setItem(STORAGE_KEY, "dark");
  };

  const toggleTheme = () => {
    // Alternância desativada propositalmente.
    setPreference("dark");
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