"use client";

import { usePathname } from "next/navigation";
import { useState, createContext, useContext } from "react";
import BottomNav from "@/components/bottomNav";
import Sidebar from "@/components/sidebar";
//import { Menu } from "lucide-react";

// Contexto para permitir que as páginas abram a sidebar
const NavContext = createContext<{ openSidebar: () => void }>({
  openSidebar: () => { },
});

export const useNav = () => useContext(NavContext);

export default function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const openSidebar = () => setIsSidebarOpen(true);

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
    <NavContext.Provider value={{ openSidebar }}>
      <div className="flex min-h-dvh w-full">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        <main
          className="w-full flex-1 transition-all duration-300"
        >
          {/* O botão de menu foi removido daqui para ser adicionado organicamente em cada página */}
          {children}
        </main>

        <div>
          <BottomNav />
        </div>
      </div>
    </NavContext.Provider>
  );
}