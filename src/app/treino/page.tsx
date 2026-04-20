"use client";

import Image from "next/image";
import { treinos, TipoTreino } from "@/data/treinos";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, MoreVertical, Play, Plus } from "lucide-react";
import toast from "react-hot-toast";

const exerciseImageMap: Record<string, string> = {
  "agachamento livre": "/imagens/exercicios/exerciciosInferior/agachamento.png",
  "leg press": "/imagens/exercicios/exerciciosInferior/leg.png",
  "cadeira extensora": "/imagens/exercicios/exerciciosInferior/cadeiraextensora.png",
  "afundo": "/imagens/exercicios/exerciciosInferior/afundo.png",
  "mesa flexora": "/imagens/exercicios/exerciciosInferior/mesaflexora.png",
  "stiff": "/imagens/exercicios/exerciciosInferior/stiff.png",
  "levantamento terra": "/imagens/exercicios/exerciciosInferior/levantamentoterra.png",
  "Elevação pélvica": "/imagens/exercicios/exerciciosInferior/elevacaopelvica.png",
  "glute bridge": "/login-bg.jpg",
  "coice no cabo": "/login-bg.jpg",
  "panturrilha em pe": "/login-bg.jpg",
  "panturrilha sentado": "/login-bg.jpg",
  "supino reto": "/login-bg.jpg",
  "supino inclinado": "/login-bg.jpg",
  "crucifixo": "/login-bg.jpg",
  "puxada frente": "/login-bg.jpg",
  "remada curvada": "/login-bg.jpg",
  "remada baixa": "/login-bg.jpg",
  "desenvolvimento": "/login-bg.jpg",
  "elevacao lateral": "/login-bg.jpg",
  "elevacao frontal": "/login-bg.jpg",
  "rosca direta": "/login-bg.jpg",
  "rosca alternada": "/login-bg.jpg",
  "rosca martelo": "/login-bg.jpg",
  "triceps corda": "/login-bg.jpg",
  "triceps testa": "/login-bg.jpg",
  "mergulho": "/login-bg.jpg",
};

const normalizeExerciseName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export default function TreinoPage() {
  const router = useRouter();
  const [userGender, setUserGender] = useState<string | null>(null);

  useEffect(() => {
    // Usamos setTimeout para evitar o erro de "cascading renders" no mount (React 19)
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

  // Gera os próximos 5 dias a partir de hoje
  const generatedDays = useMemo(() => {
    const days = [];
    const now = new Date();
    const dayNames = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
    
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(now.getDate() + i);
      days.push({
        key: dayNames[date.getDay()],
        label: dayNames[date.getDay()],
        num: date.getDate().toString().padStart(2, "0"),
        fullDate: date.toISOString().split("T")[0]
      });
    }
    return days;
  }, []);

  const [selectedDia, setSelectedDia] = useState(generatedDays[0].key);
  const [selectedTipo, setSelectedTipo] = useState<TipoTreino | null>(null);
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([]);

  const treinosCards: Array<{
    tipo: TipoTreino;
    title: string;
    subtitle: string;
    focus: string;
    icon: "down" | "up";
    coverImage: string;
  }> = useMemo(
    () => [
      {
        tipo: "inferior",
        title: "Inferior",
        subtitle: "LEG DAY",
        focus: "FOCUS",
        icon: "down",
        coverImage: "/imagens/exercicios/capadoExercicios/capa-inferior.png",
      },
      {
        tipo: "superior",
        title: "Superior",
        subtitle: "UPPER BODY",
        focus: "",
        icon: "up",
        coverImage: "/imagens/exercicios/capadoExercicios/capa-superior.png",
      },
    ],
    [],
  );

  const gruposDisponiveis = useMemo(
    () => (selectedTipo ? Object.keys(treinos[selectedTipo]) : []),
    [selectedTipo],
  );

  const toggleGrupo = (g: string) => {
    setSelectedGrupos((prev) => {
      if (prev.includes(g)) return prev.filter((x) => x !== g);
      return [...prev, g];
    });
  };

  const suggested = useMemo(() => {
    if (!selectedTipo) return [];
    return Array.from(
      new Set(
        selectedGrupos.flatMap((g) => {
          const list =
            treinos[selectedTipo]?.[g as keyof (typeof treinos)[typeof selectedTipo]];
          return Array.isArray(list) ? (list as string[]) : [];
        }),
      ),
    );
  }, [selectedGrupos, selectedTipo]);

  const getMeta = (idx: number) => {
    const sets = [4, 3, 3, 4][idx % 4];
    const reps = ["10-12", "15", "12", "20"][idx % 4];
    const suffix = idx % 4 === 3 ? "STEPS" : "REPS";
    return { sets, reps, suffix };
  };

  const formatGrupoLabel = (g: string) => {
    switch (g) {
      case "quadriceps":
        return "Quadriceps";
      case "posterior":
        return "Posterior";
      case "gluteo":
        return "Gluteo";
      case "panturrilha":
        return "Panturrilha";
      default:
        return g;
    }
  };

  const handleStartTraining = () => {
    if (!selectedTipo || selectedGrupos.length === 0) {
      toast.error("Selecione um tipo de treino e as áreas-alvo!");
      return;
    }
    sessionStorage.setItem(
      "activeTrainingConfig",
      JSON.stringify({
        tipo: selectedTipo,
        diaSemana: selectedDia,
        grupos: selectedGrupos,
      }),
    );
    router.push("/treinoExecucao");
  };

  const getExerciseImage = (exerciseName: string) => {
    const normalizedName = normalizeExerciseName(exerciseName);
    return exerciseImageMap[normalizedName] ?? "/login-bg.jpg";
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-4 sm:px-5 sm:pt-6">
      {/* NORMAL UI (CREATE/SELECT TREINO) */}
      <>
          {/* Top bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-full ring-1 ring-white/20">
                <Image
                  src={getProfileImage()}
                  alt="Foto de perfil"
                  fill
                  className="object-cover opacity-90"
                  priority
                />
              </div>
              <div className="truncate text-2xl font-bold italic leading-none text-emerald-400 sm:text-[34px]">
                WORKOUT
              </div>
            </div>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/10"
              aria-label="Mais opções"
            >
              <MoreVertical size={18} />
            </button>
          </div>

          {/* Days */}
          <div className="mt-8 flex flex-wrap items-end justify-between gap-2">
            <div className="text-xl font-semibold uppercase text-white/90 sm:text-2xl">Plano semanal</div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">Plano semanal</div>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-2">
            {generatedDays.map((d) => {
              const active = selectedDia === d.key;
              return (
                <button
                  key={d.fullDate}
                  type="button"
                  onClick={() => setSelectedDia(d.key)}
                  className={[
                    "flex flex-1 flex-col items-center justify-center rounded-2xl px-1 py-3",
                    "bg-[#121c33] ring-1 ring-white/10 transition",
                    active
                      ? "bg-gradient-to-b from-[#3f5fff] to-[#2f4df5] ring-0 shadow-[0_10px_22px_rgba(47,77,245,0.45)]"
                      : "hover:bg-[#18243e]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "text-[10px] font-semibold tracking-[0.14em] uppercase",
                      active ? "text-white/80" : "text-white/45",
                    ].join(" ")}
                  >
                    {d.label}
                  </span>
                  <span
                    className={[
                      "mt-1 text-3xl font-semibold leading-none",
                      active ? "text-white" : "text-white/80",
                    ].join(" ")}
                  >
                    {d.num}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Digite cartões */}
          <div className="mt-10 flex items-end justify-between">
            <h2 className="text-2xl font-semibold uppercase tracking-tight sm:text-3xl">Divisão de treino</h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {treinosCards.map((c) => {
              const active = selectedTipo === c.tipo;
              const Icon = c.icon === "down" ? ChevronDown : ChevronUp;
              return (
                <button
                  key={c.tipo}
                  type="button"
                  onClick={() => setSelectedTipo(c.tipo)}
                  className={[
                    "group relative min-h-[190px] overflow-hidden rounded-3xl p-4 text-left transition",
                    "bg-[#111b33] ring-1 ring-white/10",
                    active
                      ? "shadow-[0_0_0_2px_rgba(59,130,246,0.92),0_0_25px_rgba(59,130,246,0.3)]"
                      : "hover:bg-[#162544]",
                  ].join(" ")}
                >
                  <div className="absolute inset-0">
                    <Image
                      src={c.coverImage}
                      alt={c.title}
                      fill
                      className="object-cover opacity-45 transition group-hover:opacity-55"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/20" />
                  </div>

                  <div className="relative flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                      <Icon size={18} className="text-white/80" />
                    </div>

                    <span
                      className={["flex h-7 w-7 items-center justify-center rounded-full ring-1", active ? "bg-blue-500 ring-blue-300/40" : "bg-black/35 ring-white/20"].join(" ")}
                      aria-hidden
                    >
                      {active ? <Check size={14} className="text-white" /> : null}
                    </span>
                  </div>

                  <div className="relative mt-16">
                    {active ? (
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                        Active
                      </div>
                    ) : null}
                    <div className="text-3xl font-semibold leading-none sm:text-4xl">{c.title}</div>
                    <div className="mt-2 text-[11px] tracking-[0.18em] text-white/70">
                      {c.subtitle}
                    </div>
                    {c.focus ? (
                      <div className="mt-1 text-[11px] tracking-[0.18em] text-white/60">
                        {c.focus}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Áreas-alvo */}
          <div className="mt-6 flex flex-wrap gap-3">
            {gruposDisponiveis.map((g) => {
              const active = selectedGrupos.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGrupo(g)}
                  className={[
                    "flex items-center gap-2 rounded-full px-4 py-2 text-left transition",
                    "bg-[#151f35] ring-1 ring-white/10",
                    active
                      ? "shadow-[0_0_0_1px_rgba(74,222,128,0.45),0_0_16px_rgba(74,222,128,0.2)]"
                      : "hover:bg-[#1a2946]",
                  ].join(" ")}
                >
                  <span className={["h-2.5 w-2.5 rounded-full", active ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" : "bg-white/25"].join(" ")} />
                  <span className="text-sm font-medium uppercase tracking-wide">
                    {formatGrupoLabel(g)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-10 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-2xl font-semibold uppercase tracking-tight sm:text-3xl">Rotina sugerida</h2>
            <div className="text-sm text-white/55">{suggested.slice(0, 6).length} Exercícios</div>
          </div>
          <div className="mt-4 space-y-3">
            {suggested.slice(0, 6).map((name, idx) => {
              const meta = getMeta(idx);
              return (
                <div
                  key={`${name}-${idx}`}
                  className="flex items-center gap-3 rounded-3xl bg-[#151f35] p-3 ring-1 ring-white/10"
                >
                  <div className="relative h-16 w-16 flex-none overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10">
                    <Image
                      src={getExerciseImage(name)}
                      alt={name}
                      fill
                      className="object-cover opacity-85"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/30" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xl font-semibold leading-none sm:text-2xl">{name}</div>
                    <div className="mt-2 flex items-center gap-2 text-[12px] text-white/60">
                      <span className="rounded-lg bg-white/10 px-2 py-1">{meta.sets} Sets</span>
                      <span>
                        {meta.reps} {meta.suffix === "REPS" ? "Reps" : "Steps"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15 hover:bg-white/20"
                    aria-label="Adicionar exercício"
                  >
                    <Plus size={20} className="text-emerald-300" />
                  </button>
                </div>
              );
            })}
          </div>
      </>

      {/* Ação flutuante */}
      <button
        type="button"
        onClick={handleStartTraining}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#43f58f] text-black shadow-[0_14px_40px_rgba(67,245,143,0.45)] sm:right-6 sm:h-16 sm:w-16"
        aria-label="Iniciar"
      >
        <Play size={24} fill="currentColor" />
      </button>
    </div>
  );
}
