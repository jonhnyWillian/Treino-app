"use client";

import { useState } from "react";
import Image from "next/image";
import { treinos, TipoTreino } from "@/data/treinos";
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Check,
  Dumbbell,
  Plus,
  Play,
  Menu,
  User,
  Zap,
} from "lucide-react";

interface TipoTreinoProps {
  onSelectTreino: (tipo: TipoTreino) => void;
}

export default function TipoTreinoSelector({ onSelectTreino }: TipoTreinoProps) {
  const [selectedDia, setSelectedDia] = useState<
    "MON" | "TUE" | "WED" | "THU" | "FRI"
  >("TUE");
  const [selectedTipo, setSelectedTipo] = useState<TipoTreino>("inferior");
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([
    "quadriceps",
    "posterior",
    "gluteo",
    "panturrilha",
  ]);

  const handleSelect = (tipo: TipoTreino) => {
    setSelectedTipo(tipo);
    onSelectTreino(tipo);
  };

  const dias = [
    { key: "MON" as const, label: "MON", num: "12" },
    { key: "TUE" as const, label: "TUE", num: "13" },
    { key: "WED" as const, label: "WED", num: "14" },
    { key: "THU" as const, label: "THU", num: "15" },
    { key: "FRI" as const, label: "FRI", num: "16" },
  ];

  const treinosCards: Array<{
    tipo: TipoTreino;
    title: string;
    subtitle: string;
    focus: string;
    icon: "down" | "up";
  }> = [
    {
      tipo: "inferior",
      title: "Inferior",
      subtitle: "LEG DAY",
      focus: "FOCUS",
      icon: "down",
    },
    {
      tipo: "superior",
      title: "Superior",
      subtitle: "UPPER BODY",
      focus: "",
      icon: "up",
    },
  ];

  const gruposDisponiveis = Object.keys(treinos[selectedTipo]);

  const toggleGrupo = (g: string) => {
    setSelectedGrupos((prev) => {
      if (prev.includes(g)) return prev.filter((x) => x !== g);
      return [...prev, g];
    });
  };

  const suggested = Array.from(
    new Set(
      selectedGrupos.flatMap((g) => {
        const list = treinos[selectedTipo]?.[
          g as keyof typeof treinos[typeof selectedTipo]
        ];
        return Array.isArray(list) ? list : [];
      }),
    ),
  );

  const getMeta = (idx: number) => {
    const sets = [4, 3, 3, 4][idx % 4];
    const reps = ["10-12", "15", "12", "20"][idx % 4];
    const suffix = idx % 4 === 3 ? "STEPS" : "REPS";
    return { sets, reps, suffix };
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b1220] via-[#070c16] to-[#050812] text-white">
      <div className="mx-auto w-full max-w-md px-5 pb-28 pt-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="rounded-xl p-2 text-white/80 hover:bg-white/5 hover:text-white"
            aria-label="Menu"
          >
            <Menu size={22} />
          </button>

          <div className="text-center">
            <div className="text-lg font-semibold tracking-widest text-emerald-400">
              TRAINING
            </div>
          </div>

          <div className="relative h-9 w-9 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
            <Image
              src="/login-bg.jpg"
              alt="Foto de perfil"
              fill
              className="object-cover opacity-90"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center text-white/80 opacity-0">
              <User size={18} />
            </div>
          </div>
        </div>

        {/* Days */}
        <div className="mt-6 flex gap-3">
          {dias.map((d) => {
            const active = selectedDia === d.key;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setSelectedDia(d.key)}
                className={[
                  "flex flex-1 flex-col items-center justify-center rounded-2xl px-2 py-3",
                  "bg-white/5 ring-1 ring-white/10 transition",
                  active
                    ? "bg-gradient-to-b from-[#3b82f6] to-[#2563eb] ring-0 shadow-[0_0_0_1px_rgba(59,130,246,0.6)]"
                    : "hover:bg-white/10",
                ].join(" ")}
              >
                <span
                  className={[
                    "text-[11px] font-semibold tracking-wider",
                    active ? "text-white" : "text-white/60",
                  ].join(" ")}
                >
                  {d.label}
                </span>
                <span
                  className={[
                    "mt-1 text-lg font-semibold",
                    active ? "text-white" : "text-white/80",
                  ].join(" ")}
                >
                  {d.num}
                </span>
              </button>
            );
          })}
        </div>

        {/* Type cards */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          {treinosCards.map((c) => {
            const active = selectedTipo === c.tipo;
            const Icon = c.icon === "down" ? ChevronDown : ChevronUp;
            return (
              <button
                key={c.tipo}
                type="button"
                onClick={() => handleSelect(c.tipo)}
                className={[
                  "relative min-h-[140px] overflow-hidden rounded-3xl p-4 text-left",
                  "bg-white/5 ring-1 ring-white/10 transition",
                  active
                    ? "bg-[#0c1628] shadow-[0_0_0_2px_rgba(59,130,246,0.75),0_0_28px_rgba(59,130,246,0.22)] ring-0"
                    : "hover:bg-white/10",
                ].join(" ")}
              >
                {active ? (
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-10 -top-14 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl" />
                    <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-blue-500/10 blur-2xl" />
                  </div>
                ) : null}

                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                    <Icon size={18} className="text-white/80" />
                  </div>

                  <span
                    className={[
                      "flex h-[18px] w-[18px] items-center justify-center rounded-full ring-1",
                      active
                        ? "bg-white/10 ring-white/25"
                        : "bg-transparent ring-white/15",
                    ].join(" ")}
                    aria-hidden
                  >
                    {active ? <Check size={12} className="text-white/80" /> : null}
                  </span>
                </div>

                <div className="mt-10">
                  <div className="text-base font-semibold">{c.title}</div>
                  <div className="mt-1 text-[11px] tracking-[0.18em] text-white/50">
                    {c.subtitle}
                  </div>
                  {c.focus ? (
                    <div className="mt-1 text-[11px] tracking-[0.18em] text-white/50">
                      {c.focus}
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Target Areas */}
        <div className="mt-7 flex items-end justify-between">
          <h2 className="text-xl font-semibold">Target Areas</h2>
          <div className="text-xs font-semibold tracking-widest text-emerald-400">
            {selectedGrupos.length} SELECTED
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {gruposDisponiveis.map((g) => {
            const active = selectedGrupos.includes(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggleGrupo(g)}
                className={[
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-left",
                  "bg-white/5 ring-1 ring-white/10 transition",
                  active ? "shadow-[0_0_0_1px_rgba(16,185,129,0.45)]" : "hover:bg-white/10",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-2 w-2 rounded-full",
                    active ? "bg-emerald-400" : "bg-white/25",
                  ].join(" ")}
                />
                <span className="text-sm font-medium capitalize">
                  {g === "quadriceps"
                    ? "Quadriceps"
                    : g === "posterior"
                      ? "Posterior"
                      : g === "gluteo"
                        ? "Gluteo"
                        : g === "panturrilha"
                          ? "Panturrilha"
                          : g}
                </span>
              </button>
            );
          })}
        </div>

        {/* Suggested Routine */}
        <h2 className="mt-8 text-xl font-semibold">Suggested Routine</h2>

        <div className="mt-4 space-y-3">
          {suggested.slice(0, 6).map((name, idx) => {
            const meta = getMeta(idx);
            return (
              <div
                key={`${name}-${idx}`}
                className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10"
              >
                <div className="relative h-14 w-14 flex-none overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10">
                  <Image
                    src="/login-bg.jpg"
                    alt="Exercício"
                    fill
                    className="object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/30" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{name}</div>
                  <div className="mt-1 flex items-center gap-4 text-[11px] tracking-widest text-white/50">
                    <span>{meta.sets} SETS</span>
                    <span>
                      {meta.reps} {meta.suffix}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
                  aria-label="Adicionar exercício"
                >
                  <Plus size={18} className="text-white/80" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating action */}
      <button
        type="button"
        className="fixed bottom-20 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400 text-black shadow-[0_18px_45px_rgba(16,185,129,0.35)]"
        aria-label="Iniciar"
      >
        <Play size={22} fill="currentColor" />
      </button>

      {/* Bottom nav (visual) */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#050812]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center justify-between px-10 py-4 text-white/70">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-black"
            aria-label="Treino"
          >
            <Dumbbell size={18} />
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl hover:bg-white/5"
            aria-label="Atividade"
          >
            <Activity size={18} />
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl hover:bg-white/5"
            aria-label="Energia"
          >
            <Zap size={18} />
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl hover:bg-white/5"
            aria-label="Biblioteca"
          >
            <BookOpen size={18} />
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl hover:bg-white/5"
            aria-label="Perfil"
          >
            <User size={18} />
          </button>
        </div>
      </nav>
    </main>
  );
}