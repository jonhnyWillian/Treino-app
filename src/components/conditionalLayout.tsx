"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import SidebarNav from "@/components/layout/sidebarNav";
import { Menu, Flame } from "lucide-react";

const rotasPublicas = ["/", "/public/cadastro", "/public/redefinirSenha", "/public/resetar-senha"];

function isPublicRoute(pathname: string) {
  return (
    pathname === "/" ||
    rotasPublicas.filter((r) => r !== "/").some((prefix) => pathname.startsWith(prefix))
  );
}

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#060c18]">

      <SidebarNav
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

        {/* Header mobile — classes em linha, sem quebras de linha */}
        <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-white/5 bg-[#090f1c] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-all"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500">
              <Flame className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">TreinoUP</span>
          </div>

          <div className="h-8 w-8" />
        </header>

        {/* Main — classes em linha, sem quebras de linha */}
        <main className="flex-1 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden min-w-0">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}