"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import BottomNav from "@/components/bottomNav";
import Sidebar from "@/components/sidebar";
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
    <div className="flex w-full min-h-screen">
      {/* Sidebar - Handles its own desktop visibility via CSS */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <main className={`flex-1 w-full transition-all duration-300 ${isSidebarOpen ? "lg:pl-[280px]" : "lg:pl-0"}`}>
        {/* Mobile Menu Button - Fixed at top-left */}
        <div className={`fixed top-6 left-6 z-[55] ${isSidebarOpen ? "lg:hidden" : ""}`}>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-3 rounded-2xl bg-[#0b1220]/80 backdrop-blur-xl border border-white/10 text-white/80 hover:text-white transition-all active:scale-95 shadow-xl"
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