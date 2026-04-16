"use client";

import { useState, useEffect } from "react";
import {  X, Settings, LogOut, 
  Dumbbell, History as HistoryIcon, 
  ShieldCheck, HelpCircle, LayoutDashboard, User
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { getPerfil } from "@/services/api";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ nome: string; email: string; sexo?: string } | null>(null);

  useEffect(() => {
    getPerfil().then(data => {
      if (data.nome) setUser(data);
    }).catch(() => {});
  }, []);

  const getProfileImage = () => {
    if (user?.sexo === "Feminino") return "/imagens/perfil/feminino.png";
    return "/imagens/perfil/masculino.png";
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    router.push("/");
    onClose();
  };

  return (
    <>
      {/* Overlay - Apenas Mobile */}
      <div 
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside 
        className={`fixed top-0 left-0 z-[70] h-full w-[280px] bg-[#0b1220] border-r border-white/10 shadow-2xl transition-transform duration-300 ease-out lg:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="text-2xl font-black tracking-tighter text-emerald-400">WORKOUT APP</div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/60">
              <X size={24} />
            </button>
          </div>

          {/* User Profile Info */}
          <div className="mb-8 p-4 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors group">
            <div className="flex items-center gap-4">
              <div className="relative h-12 w-12 shrink-0 rounded-2xl bg-emerald-400/10 flex items-center justify-center overflow-hidden ring-1 ring-white/10 group-hover:ring-emerald-400/30 transition-all">
                <Image 
                  src={getProfileImage()} 
                  alt="Perfil" 
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="font-bold truncate text-white text-sm tracking-tight">{user?.nome || "Usuário"}</div>
                <div className="text-[10px] font-bold text-white/30 truncate uppercase tracking-widest mt-0.5">{user?.email || "Carregando..."}</div>
              </div>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 space-y-2">
            <SidebarLink 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
              href="/dashboard" 
              active={pathname === "/dashboard"}
              onClick={onClose} 
            />
            <SidebarLink 
              icon={<Dumbbell size={20} />} 
              label="Meus Treinos" 
              href="/treino" 
              active={pathname === "/treino"}
              onClick={onClose} 
            />
            <SidebarLink 
              icon={<HistoryIcon size={20} />} 
              label="Histórico" 
              href="/historico" 
              active={pathname === "/historico"}
              onClick={onClose} 
            />
            <SidebarLink 
              icon={<User size={20} />} 
              label="Perfil" 
              href="/perfil" 
              active={pathname === "/perfil"}
              onClick={onClose} 
            />
            
            <div className="h-px bg-white/5 my-6" />
            
            <SidebarLink 
              icon={<ShieldCheck size={20} />} 
              label="Privacidade" 
              href="/privacidade" 
              active={pathname === "/privacidade"}
              onClick={onClose} 
            />
            <SidebarLink 
              icon={<HelpCircle size={20} />} 
              label="Suporte" 
              href="/suporte" 
              active={pathname === "/suporte"}
              onClick={onClose} 
            />
          </nav>

          {/* Logout */}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 p-4 rounded-2xl text-red-400 hover:bg-red-400/10 transition mt-auto"
          >
            <LogOut size={20} />
            <span className="font-medium">Sair da Conta</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarLink({ 
  icon, 
  label, 
  href, 
  active,
  onClick 
}: { 
  icon: React.ReactNode, 
  label: string, 
  href: string, 
  active?: boolean,
  onClick: () => void 
}) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 group ${
        active 
          ? "bg-emerald-400/10 text-emerald-400 shadow-[0_10px_20px_rgba(16,185,129,0.05)]" 
          : "text-white/50 hover:bg-white/[0.03] hover:text-white"
      }`}
    >
      <div className={`transition-transform duration-300 group-hover:scale-110 ${active ? "text-emerald-400" : "text-white/30 group-hover:text-emerald-400/70"}`}>
        {icon}
      </div>
      <span className={`font-bold text-sm tracking-tight transition-colors ${active ? "text-emerald-400" : ""}`}>
        {label}
      </span>
      {active && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
      )}
    </Link>
  );
}
