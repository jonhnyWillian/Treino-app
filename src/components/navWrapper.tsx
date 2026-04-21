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
      <main className="w-full min-h-dvh flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-[460px]">
          {children}
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh w-full">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main
        className="w-full flex-1 pt-20 pb-24 transition-all duration-300 sm:pt-24"
      >
        <div className="fixed left-4 top-4 z-[55] sm:left-6 sm:top-6">
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

      <div>
        <BottomNav />
      </div>
    </div>
  );
}