"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell, ChevronRight, Dumbbell, Flame, Plus, Timer, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { getDashboardResumo, type DashboardResumoResponse } from "@/services/api";

export default function DashboardPage() {
  const [userGender, setUserGender] = useState<string | null>(null);
  const [userName, setUserName] = useState("Atleta");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardResumoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("Bom dia");

  const getGreetingByHour = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const userStr = localStorage.getItem("usuario");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.sexo) setUserGender(user.sexo);
          if (user.nome) setUserName(user.nome);
          if (user.fotoPerfil) setProfilePhoto(user.fotoPerfil);
        } catch {}
      }

      const resumo = await getDashboardResumo();
      setDashboardData(resumo);
      setLoading(false);
    }, 0);

    return () => clearTimeout(timeout);
  }, []);

  // ✅ Depois — inicializa já com o valor correto e só usa o effect para o intervalo


useEffect(() => {
  const interval = setInterval(() => {
    setGreeting(getGreetingByHour());
  }, 60_000);

  return () => clearInterval(interval);
}, []);

  const getProfileImage = () => {
    if (userGender === "Feminino") return "/imagens/perfil/feminino.png";
    return "/imagens/perfil/masculino.png";
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "--";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins} min`;
  };

  const formatDateTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const weekData = dashboardData?.semana ?? [];
  const maxWeek = Math.max(...weekData.map((d) => d.treinos), 1);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-4 sm:px-5 sm:pt-5">
      <div className="flex items-center justify-between">
        <div className="text-blue-400 text-lg font-semibold uppercase tracking-wider">WORKOUT</div>
        <div className="flex items-center gap-3">
          <Bell size={14} className="text-white/60" />
          <div className="relative h-8 w-8 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
            <Image
              src={profilePhoto || getProfileImage()}
              alt="Foto de perfil"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h1 className="text-3xl font-bold leading-tight text-white sm:text-[34px] sm:leading-none">
          {greeting}, <span className="text-blue-400">{userName.split(" ")[0]}</span>
        </h1>
        <p className="mt-1 text-sm text-white/50">Seu corpo e o reflexo da sua disciplina.</p>
      </div>

      <div className="mt-5 rounded-3xl bg-[#0f1a31] p-4 ring-1 ring-white/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Consistência</div>
            <div className="mt-1 text-3xl font-bold text-white sm:text-4xl">
              {dashboardData?.resumo.totalTreinos ?? 0}
              <span className="ml-1 text-sm font-medium text-white/60">dias seguidos</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-400">
            <Flame size={24} />
          </div>
        </div>
      </div>

      <Link href="/treino" className="mt-5 block overflow-hidden rounded-3xl ring-1 ring-white/10">
        <div className="relative h-48">
          <Image src="/login-bg.jpg" alt="Treino" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/75" />
          <div className="absolute inset-0 p-4">
            <div className="inline-flex rounded-full bg-blue-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em]">
              Hoje - Próximo treino
            </div>
            <div className="mt-4 text-3xl font-extrabold italic text-white/90 sm:text-4xl">TREINO B</div>
            <div className="text-lg text-blue-300">Costas e Bíceps</div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold uppercase tracking-wider">
              Iniciar treino <ChevronRight size={16} />
            </div>
          </div>
        </div>
      </Link>

      <div className="mt-5 rounded-3xl bg-[#0f1a31] p-4 ring-1 ring-white/10">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold uppercase text-white/80">Último treino</div>
          <div className="text-xs text-white/40">
            {dashboardData?.ultimoTreino?.dataTreino
              ? formatDateTime(dashboardData.ultimoTreino.dataTreino)
              : "--"}
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {(dashboardData?.ultimoTreino?.exercicios ?? []).slice(0, 3).map((ex) => (
            <div key={ex.nome} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{ex.nome}</div>
                <div className="text-xs text-white/45">{ex.series} séries</div>
              </div>
              <div className="text-sm font-semibold text-emerald-300">{ex.volumeKg.toFixed(0)} kg</div>
            </div>
          ))}
          {(dashboardData?.ultimoTreino?.exercicios ?? []).length === 0 && (
            <div className="rounded-xl bg-white/5 p-3 text-sm text-white/55">
              Nenhum treino concluído ainda.
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-3xl bg-[#0f1a31] p-4 ring-1 ring-white/10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.15em] text-white/45">Esta semana</div>
            <div className="mt-1 text-3xl font-bold text-white">
              {(dashboardData?.resumo.totalVolumeKg ?? 0).toFixed(1)}
              <span className="ml-1 text-base text-white/60">kg</span>
            </div>
          </div>
          <div className="text-white/40">
            <Timer size={16} className="inline" />{" "}
            {formatDuration(dashboardData?.resumo.totalDuracaoSegundos ?? 0)}
          </div>
        </div>
        <div className="mt-4 grid h-40 grid-cols-7 items-end gap-2">
          {weekData.map((day) => (
            <div key={day.date} className="flex h-full flex-col items-center justify-end gap-2">
              <div
                className={`w-full rounded-md ${day.treinos > 0 ? "bg-blue-500" : "bg-white/10"}`}
                style={{ height: `${Math.max((day.treinos / maxWeek) * 100, 12)}%` }}
              />
              <div className="text-[10px] text-white/40">{day.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#0f1a31] p-4 ring-1 ring-white/10">
          <div className="text-[10px] uppercase tracking-[0.15em] text-white/45">Recorde pessoal</div>
          <div className="mt-2 text-2xl font-bold text-white">
            {dashboardData?.destaques.recordeCargaKg ?? 0}
            <span className="ml-1 text-sm text-white/55">kg</span>
          </div>
          <div className="mt-1 line-clamp-2 text-xs text-blue-300">
            {dashboardData?.destaques.recordeExercicio ?? "--"}
          </div>
        </div>
        <div className="rounded-2xl bg-[#0f1a31] p-4 ring-1 ring-white/10">
          <div className="text-[10px] uppercase tracking-[0.15em] text-white/45">Média treino</div>
          <div className="mt-2 text-2xl font-bold text-white">
            {formatDuration(
              dashboardData?.resumo.totalTreinos
                ? Math.floor(
                    (dashboardData.resumo.totalDuracaoSegundos || 0) /
                      dashboardData.resumo.totalTreinos
                  )
                : 0
            )}
          </div>
          <div className="mt-1 text-xs text-white/45">por sessão</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/treino"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-semibold"
        >
          <Dumbbell size={16} /> Treinar
        </Link>
        <Link
          href="/historico"
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/10 py-3 text-sm font-semibold"
        >
          <Trophy size={16} /> Insights
        </Link>
        <button
          type="button"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500"
          aria-label="Nova ação"
        >
          <Plus size={18} />
        </button>
      </div>

      {loading ? <div className="mt-4 text-center text-xs text-white/40">Carregando dados...</div> : null}
    </div>
  );
}