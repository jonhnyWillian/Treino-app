"use client"; 

import Link from "next/link"; // Componente para navegação entre páginas
import { usePathname } from "next/navigation"; // Hook para obter a rota atual
import { FitnessCenter,  Home, Person, History, MilitaryTech } from "@mui/icons-material"; // Ícones do Material UI

export default function BottomNav() {
  const pathname = usePathname(); // Guarda o caminho atual da URL

  // Lista de itens da navegação inferior
  const navItems = [
    { href: "/dashboard", icon: <Home fontSize="small" />, label: "Home" },
    { href: "/treino", icon: <FitnessCenter fontSize="small" />, label: "Treino" },
    { href: "/recordes", icon: <MilitaryTech fontSize="medium" />, label: "Recordes", isCenter: true },
    { href: "/historico", icon: <History fontSize="small" />, label: "Histórico" },
    { href: "/perfil", icon: <Person fontSize="small" />, label: "Perfil" },
  ];

  return (
    // Container principal da barra de navegação fixa na parte inferior
    <nav className="theme-surface fixed bottom-0 left-1/2 w-full max-w-[480px] -translate-x-1/2 z-50 border-t backdrop-blur-xl sm:bottom-6 sm:w-[440px] sm:rounded-3xl sm:border sm:shadow-2xl">
      
      {/* Wrapper interno para alinhar os itens */}
      <div className="mx-auto flex w-full items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Percorre cada item de navegação */}
        {navItems.map((item) => {
          const isActive = pathname === item.href; // Verifica se o item é a rota atual

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -top-5 flex flex-col items-center"
                aria-label={item.label}
              >
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-full transition-all duration-300 ${
                    isActive
                      ? "bg-emerald-400 text-black shadow-[0_10px_25px_rgba(52,211,153,0.5)] scale-110"
                      : "bg-[#1e293b] text-white/50 border border-white/10"
                  }`}
                >
                  {item.icon}
                </div>
                <span className={`mt-1 text-[10px] font-bold uppercase tracking-tighter ${isActive ? 'text-emerald-400' : 'text-white/30'}`}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href} // Chave única para cada item
              href={item.href} // Rota de destino
              className="flex flex-col items-center justify-center transition"
              aria-label={item.label} // Acessibilidade (descrição do botão)
            >
              <div
                className={[
                  // Estilos base do botão
                  "flex h-10 w-10 items-center justify-center rounded-2xl transition",

                  // Estilos condicionais (ativo ou não)
                  isActive
                    ? "bg-emerald-400/20 text-emerald-400 ring-1 ring-emerald-400/30" // Quando ativo
                    : "theme-text-muted hover:bg-black/5 hover:text-current", // Quando inativo
                ].join(" ")}
              >
                {/* Ícone do item */}
                {item.icon}
              </div>
              <span className={`mt-1 text-[9px] font-medium ${isActive ? 'text-emerald-400' : 'text-white/40'}`}>
                {item.label === "Dashboard" ? "Home" : item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}