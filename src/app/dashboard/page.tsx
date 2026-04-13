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
    <div className="w-full px-5 pb-32 pt-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="lg:hidden w-9 h-9" /> {/* Espaçador para o botão de menu fixo no mobile */}

        <div className="text-center">
          <div className="text-lg font-semibold tracking-widest text-emerald-400">
            TRAINING
          </div>
        </div>

        <div className="relative h-9 w-9 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
          <Image
            src={getProfileImage()}
            alt="Foto de perfil"
            fill
            className="object-cover opacity-90"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent" />
        </div>
      </div>

      {/* Hero */}
      <div className="mt-6">
        <div className="relative overflow-hidden rounded-[28px] bg-white/5 p-6 ring-1 ring-white/10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 -top-24 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-transparent" />
          </div>

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold tracking-widest text-emerald-300 ring-1 ring-emerald-400/15">
                  STATUS • ATIVO
                </span>
              </div>

              <h1 className="mt-3 text-3xl font-semibold leading-tight">
                Meu Treino
              </h1>

              <p className="mt-2 max-w-[26ch] text-sm text-white/55">
                Alta performance não é coincidência, é rotina. Organize sua evolução hoje.
              </p>
            </div>

            <div className="flex flex-col items-end">
              <div className="text-[11px] font-semibold tracking-widest text-white/50">
                EVOLUÇÃO
              </div>
              <div className="mt-1 text-3xl font-semibold text-white">
                +12%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/treino"
          className="block rounded-[26px] bg-white/5 p-5 ring-1 ring-white/10 transition hover:bg-white/10"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/10 ring-1 ring-emerald-400/15">
              <Dumbbell size={18} className="text-emerald-300" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold">Criar Treino</div>
              <div className="mt-1 text-sm text-white/55">
                Monte seu treino semanal personalizado com base nos seus objetivos.
              </div>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-xs font-semibold tracking-widest text-black shadow-[0_18px_45px_rgba(16,185,129,0.25)]">
                COMEÇAR AGORA
                <ArrowUpRight size={14} />
              </div>
            </div>
          </div>
        </Link>

        <div className="rounded-[26px] bg-white/5 p-5 ring-1 ring-white/10">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
              <History size={18} className="text-white/75" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold">Histórico</div>
              <div className="mt-1 text-sm text-white/55">
                Veja seus treinos realizados e acompanhe suas métricas passadas.
              </div>

              <Link
                href="/historico"
                className="mt-4 inline-block rounded-full bg-white/5 px-6 py-3 text-xs font-semibold tracking-widest text-white/75 ring-1 ring-white/10 hover:bg-white/10"
              >
                VISUALIZAR LISTA
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="text-[10px] font-semibold tracking-widest text-white/45">
            TOTAL SESSIONS
          </div>
          <div className="mt-2 text-3xl font-semibold">128</div>
        </div>

        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="text-[10px] font-semibold tracking-widest text-white/45">
            ACTIVE STREAK
          </div>
          <div className="mt-2 text-3xl font-semibold text-emerald-300">12</div>
        </div>

        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="text-[10px] font-semibold tracking-widest text-white/45">
            VOLUME (KG)
          </div>
          <div className="mt-2 text-3xl font-semibold">1.2k</div>
        </div>

        <div className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10">
          <div className="text-[10px] font-semibold tracking-widest text-white/45">
            AVG TIME
          </div>
          <div className="mt-2 text-3xl font-semibold">54m</div>
        </div>
      </div>
    </div>
  );
}