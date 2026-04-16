"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Dumbbell, History } from "lucide-react";
import { useState, useEffect } from "react";

export default function DashboardPage() {
  const [userGender, setUserGender] = useState<string | null>(null);

  useEffect(() => {
    // Usamos setTimeout para evitar o erro de "cascading renders" no mount (React 19)
    // Isso garante que o estado seja atualizado logo após o primeiro render
    const timeout = setTimeout(() => {
      const userStr = localStorage.getItem("usuario");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.sexo) setUserGender(user.sexo);
        } catch {}
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, []);

  const getProfileImage = () => {
    if (userGender === "Feminino") return "/imagens/perfil/feminino.png";
    return "/imagens/perfil/masculino.png";
  };

  return (
    <div className="w-full px-6 pb-32 pt-10 max-w-7xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="lg:hidden w-10 h-10" /> {/* Spacer for menu button */}
          <div>
            <h2 className="text-white/40 text-[10px] font-bold tracking-[0.3em] uppercase">Painel de Controle</h2>
            <h1 className="text-white text-2xl font-black tracking-tight">Dashboard</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <div className="text-white text-sm font-bold tracking-tight">Olá, Treinador!</div>
            <div className="text-emerald-400 text-[10px] font-bold tracking-widest uppercase mt-0.5">Nível 12 • Pro</div>
          </div>
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-white/5 border border-white/10 group cursor-pointer hover:border-emerald-400/30 transition-all">
            <Image
              src={getProfileImage()}
              alt="Foto de perfil"
              fill
              className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              priority
            />
          </div>
        </div>
      </div>

      {/* Hero / Welcome */}
      <div className="relative overflow-hidden rounded-[40px] bg-[#0f172a] p-8 md:p-12 border border-white/10 mb-8 shadow-2xl group">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px] transition-all group-hover:bg-emerald-500/20" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px] transition-all group-hover:bg-blue-600/20" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-4 py-1.5 text-[10px] font-bold tracking-[0.2em] text-emerald-400 border border-emerald-400/20 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              SISTEMA ATIVO
            </div>
            <h2 className="text-white text-4xl md:text-5xl font-black tracking-tighter leading-[0.9] mb-4">
              SEU TREINO,<br />
              SUA <span className="text-emerald-400">EVOLUÇÃO</span>.
            </h2>
            <p className="text-white/40 text-sm md:text-base font-medium leading-relaxed mb-8">
              Alta performance não é coincidência, é rotina organizada. Acompanhe seus resultados e supere seus limites hoje.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black tracking-widest text-xs rounded-2xl transition-all shadow-[0_20px_40px_rgba(16,185,129,0.2)] active:scale-95">
                NOVA SESSÃO
              </button>
              <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-black tracking-widest text-xs rounded-2xl border border-white/10 transition-all active:scale-95">
                VER PLANOS
              </button>
            </div>
          </div>

          <div className="flex flex-row md:flex-col gap-4 md:gap-2 items-end justify-between md:justify-center">
            <div className="text-right">
              <div className="text-white/30 text-[10px] font-black tracking-[0.3em] uppercase mb-1">Crescimento Mensal</div>
              <div className="text-white text-5xl md:text-7xl font-black tracking-tighter leading-none">+12<span className="text-emerald-400 text-3xl md:text-4xl">%</span></div>
            </div>
            <div className="h-1 w-24 md:w-32 bg-white/5 rounded-full overflow-hidden mt-4">
              <div className="h-full w-[70%] bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Primary Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link href="/treino" className="group relative overflow-hidden rounded-[32px] bg-white/[0.03] p-8 border border-white/5 hover:border-emerald-400/30 transition-all">
          <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-emerald-400/20 transition-colors">
            <Dumbbell size={80} strokeWidth={1.5} />
          </div>
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-400/20 mb-6 group-hover:scale-110 transition-transform">
              <Dumbbell className="text-emerald-400" size={24} />
            </div>
            <h3 className="text-white text-xl font-black tracking-tight mb-2">Montar Treino</h3>
            <p className="text-white/40 text-sm font-medium leading-relaxed max-w-[24ch] mb-8">
              Crie rotinas personalizadas focadas nos seus objetivos de força ou hipertrofia.
            </p>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-black tracking-widest uppercase group-hover:gap-4 transition-all">
              Acessar Módulo <ArrowUpRight size={16} />
            </div>
          </div>
        </Link>

        <Link href="/historico" className="group relative overflow-hidden rounded-[32px] bg-white/[0.03] p-8 border border-white/5 hover:border-blue-400/30 transition-all">
          <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-blue-400/20 transition-colors">
            <History size={80} strokeWidth={1.5} />
          </div>
          <div className="relative">
            <div className="h-14 w-14 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-400/20 mb-6 group-hover:scale-110 transition-transform">
              <History className="text-blue-400" size={24} />
            </div>
            <h3 className="text-white text-xl font-black tracking-tight mb-2">Histórico Geral</h3>
            <p className="text-white/40 text-sm font-medium leading-relaxed max-w-[24ch] mb-8">
              Analise sua evolução ao longo do tempo e compare suas cargas passadas.
            </p>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-black tracking-widest uppercase group-hover:gap-4 transition-all">
              Ver Relatórios <ArrowUpRight size={16} />
            </div>
          </div>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard label="Sessões" value="128" />
        <StatCard label="Sequência" value="12" highlight />
        <StatCard label="Volume (kg)" value="1.2k" />
        <StatCard label="Média" value="54m" />
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className="rounded-[28px] bg-white/[0.03] p-6 border border-white/5 hover:bg-white/[0.05] transition-all group">
      <div className="text-white/30 text-[10px] font-black tracking-[0.2em] uppercase mb-3">{label}</div>
      <div className={`text-3xl md:text-4xl font-black tracking-tighter ${highlight ? "text-emerald-400" : "text-white"}`}>
        {value}
      </div>
      <div className="mt-4 h-1 w-8 bg-white/10 rounded-full group-hover:w-16 transition-all duration-500" />
    </div>
  );
}