"use client"; 

import Link from "next/link"; // Componente para navegação entre páginas
import { usePathname } from "next/navigation"; // Hook para obter a rota atual
import { FitnessCenter,EmojiEvents , Home, Person, History } from "@mui/icons-material"; // Ícones do Material UI

export default function BottomNav() {
  const pathname = usePathname(); // Guarda o caminho atual da URL

  // Lista de itens da navegação inferior
  const navItems = [
    { href: "/treino", icon: <FitnessCenter fontSize="small" />, label: "Treino" },
    { href: "/recordes", icon: <EmojiEvents  fontSize="small" />, label: "Recordes" },
    { href: "/dashboard", icon: <Home fontSize="small" />, label: "Home" },
    { href: "/historico", icon: <History fontSize="small" />, label: "Histórico" },
    { href: "/perfil", icon: <Person fontSize="small" />, label: "Perfil" },
  ];

  return (
    // Container principal da barra de navegação fixa na parte inferior
    <nav className="theme-surface fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl sm:bottom-6 sm:left-1/2 sm:right-auto sm:w-[440px] sm:-translate-x-1/2 sm:rounded-3xl sm:border sm:shadow-2xl">
      
      {/* Wrapper interno para alinhar os itens */}
      <div className="mx-auto flex w-full items-center justify-between px-6 py-3 sm:px-8">
        
        {/* Percorre cada item de navegação */}
        {navItems.map((item) => {
          const isActive = pathname === item.href; // Verifica se o item é a rota atual

          return (
            <Link
              key={item.href} // Chave única para cada item
              href={item.href} // Rota de destino
              className="flex h-11 w-11 items-center justify-center rounded-2xl transition"
              aria-label={item.label} // Acessibilidade (descrição do botão)
            >
              <div
                className={[
                  // Estilos base do botão
                  "flex h-11 w-11 items-center justify-center rounded-2xl transition",

                  // Estilos condicionais (ativo ou não)
                  isActive
                    ? "bg-emerald-400 text-black shadow-[0_18px_45px_rgba(16,185,129,0.25)]" // Quando ativo
                    : "theme-text-muted hover:bg-black/5 hover:text-current", // Quando inativo
                ].join(" ")}
              >
                {/* Ícone do item */}
                {item.icon}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}