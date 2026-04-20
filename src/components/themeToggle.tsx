"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/themeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={isDark ? "Modo claro" : "Modo escuro"}
      className="theme-toggle-btn"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="hidden text-xs font-semibold sm:inline">{isDark ? "Claro" : "Escuro"}</span>
    </button>
  );
}
