"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import BottomNav from "@/components/bottomNav";
import Sidebar from "@/components/sidebar";
import ThemeToggle from "@/components/themeToggle";
import { Menu } from "lucide-react";

export default function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Rotas onde NÃO deve aparecer a navbar
  const hiddenRoutes = ["/", "/cadastro", "/redefinirSenha", "/resetar-senha"] as const;

  const shouldHide =
    pathname === "/" ||
    hiddenRoutes
      .filter((r) => r !== "/")
      .some((prefix) => pathname.startsWith(prefix));

  if (shouldHide) {
    return (
      <main className="w-full flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar - Handles its own desktop visibility via CSS */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <main
        className={`w-full flex-1 pt-20 transition-all duration-300 sm:pt-24 lg:pt-0 ${
          isSidebarOpen ? "lg:pl-[280px]" : "lg:pl-0"
        }`}
      >
        <div className="fixed right-4 top-4 z-[55] sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>

        {/* Mobile Menu Button - Fixed at top-left */}
        <div className={`fixed left-4 top-4 z-[55] sm:left-6 sm:top-6 ${isSidebarOpen ? "lg:hidden" : ""}`}>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="theme-icon-btn p-3"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
        </div>

        {children}
      </main>

      {/* Bottom Nav - Only visible on mobile */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}