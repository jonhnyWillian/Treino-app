"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, User, History, Trophy,
  Users, CreditCard, Bell, LogOut, Flame, X, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Menus por role ───────────────────────────────────────────────────────────

const navCliente = [
  { label: "Dashboard", href: "/cliente/dashboard", icon: LayoutDashboard },
  { label: "Histórico",  href: "/cliente/historico", icon: History },
  { label: "Recordes",   href: "/cliente/recordes",  icon: Trophy },
  { label: "Perfil",     href: "/cliente/perfil",    icon: User },
];

const navAdmin = [
  { label: "Dashboard",    href: "/admin/dashboard",    icon: LayoutDashboard },
  { label: "Clientes",     href: "/admin/cliente",      icon: Users },
  { label: "Mensalidades", href: "/admin/mensalidade",  icon: CreditCard },
  { label: "Alertas",      href: "/admin/alertas",      icon: Bell },
];

// ─── Tipos ────────────────────────────────────────────────────────────────────

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

interface SidebarContentProps {
  navItems: NavItem[];
  role: "admin" | "cliente";
  pathname: string;
  onClose?: () => void;
  onLogout: () => void;
  showCloseButton?: boolean;
}

// ─── SidebarContent ───────────────────────────────────────────────────────────
// Declarado FORA do SidebarNav para evitar recriação a cada render.
// Recebe o usuário via prop derivada do AuthContext no componente pai.

function SidebarContent({
  navItems,
  role,
  pathname,
  onClose,
  onLogout,
  showCloseButton = false,
}: SidebarContentProps) {
  // Acessa o usuário diretamente do contexto — sem getPerfil duplicado
  const { usuario } = useAuth();

  // Imagem de perfil: foto salva > padrão por sexo
  const perfilSrc =
    usuario?.fotoPerfil
      ? usuario.fotoPerfil
      : usuario?.sexo === "Feminino"
        ? "/imagens/perfil/feminino.png"
        : "/imagens/perfil/masculino.png";

  return (
    <aside className="flex h-full w-[260px] flex-col border-r border-white/5 bg-[#090f1c]">

      {/* ── LOGO ── */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-white/5 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 shadow-lg shadow-emerald-500/20">
          <Flame className="h-4 w-4 text-white" />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-white">TreinoUP</span>

        {/* Botão fechar — visível apenas no drawer mobile */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="ml-auto text-slate-400 hover:text-white transition-colors"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── PERFIL RESUMIDO ── */}
      <div className="px-3 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/5">
          <div className="relative h-9 w-9 shrink-0 rounded-xl overflow-hidden ring-1 ring-white/10">
            <Image src={perfilSrc} alt="Perfil" fill sizes="36px" className="object-cover" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate leading-tight">
              {usuario?.nome ?? "Usuário"}
            </p>
            <p className="text-[10px] text-white/30 truncate">
              {usuario?.email ?? "..."}
            </p>
          </div>

          {/* Badge de role */}
          <span className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            role === "admin"
              ? "bg-amber-500/15 text-amber-400"
              : "bg-emerald-500/15 text-emerald-400"
          )}>
            {role === "admin" ? "Admin" : "Cliente"}
          </span>
        </div>
      </div>

      {/* ── NAVEGAÇÃO ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {role === "admin" ? "Administração" : "Menu"}
        </p>

        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              onClick={onClose} // fecha drawer mobile ao navegar
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-gradient-to-r from-emerald-500/15 to-cyan-500/5 text-emerald-400 ring-1 ring-emerald-400/10"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon size={18} className={cn(
                "shrink-0 transition-colors",
                active ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300"
              )} />
              <span className="flex-1">{label}</span>
              {active
                ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                : <ChevronRight size={14} className="opacity-0 group-hover:opacity-40 transition-opacity" />
              }
            </Link>
          );
        })}
      </nav>

      {/* ── LOGOUT ── */}
      <div className="px-3 py-4 border-t border-white/5 shrink-0">
        <button
          onClick={onLogout}
          className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut size={18} className="shrink-0 text-slate-500 group-hover:text-red-400 transition-colors" />
          Sair da conta
        </button>
      </div>
    </aside>
  );
}

// ─── SidebarNav (componente principal) ───────────────────────────────────────

interface SidebarNavProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function SidebarNav({ mobileOpen = false, onMobileClose }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { usuario, setUsuario } = useAuth();

  // Role derivado do contexto — sem getPerfil duplicado nem localStorage
  const role = (usuario?.role ?? "cliente") as "admin" | "cliente";
  const navItems = role === "admin" ? navAdmin : navCliente;

  /**
   * Logout: limpa cookie no backend, limpa contexto React e sessionStorage,
   * e redireciona para a tela de login.
   * Sem localStorage — tudo gerenciado pelo AuthContext.
   */
  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Silencioso — mesmo se falhar, limpa contexto e redireciona
    }
    setUsuario(null); // limpa sessionStorage via wrapper do AuthContext
    router.push("/");
  };

  const sharedProps = {
    navItems,
    role,
    pathname,
    onLogout: handleLogout,
  };

  return (
    <>
      {/* ── DESKTOP: sidebar fixa, sempre visível ── */}
      <div className="hidden lg:flex h-full">
        <SidebarContent {...sharedProps} />
      </div>

      {/* ── MOBILE: drawer deslizante com overlay ── */}
      {mobileOpen && (
        <>
          {/* Overlay escuro atrás do drawer */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden animate-in slide-in-from-left duration-200">
            <SidebarContent
              {...sharedProps}
              showCloseButton
              onClose={onMobileClose}
            />
          </div>
        </>
      )}
    </>
  );
}