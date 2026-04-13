"use client";

import Image from "next/image";
import { treinos, TipoTreino } from "@/data/treinos";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Play, Plus, X, Timer } from "lucide-react";
import { finalizarTreino } from "@/services/api";
import toast from "react-hot-toast";

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

  // Estados para Treino Ativo
  const [isTraining, setIsTraining] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [showVideoModal, setShowPasswordModal] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentExerciseName, setCurrentExerciseName] = useState("");

  const handleShowVideo = (exerciseName: string) => {
    const name = exerciseName.toLowerCase();
    
    if (name.includes("agachamento livre")) {
      setCurrentVideoUrl("/exercicios/agachamentoLivre/agachamentoLivre.mp4");
      setCurrentExerciseName(exerciseName);
      setShowPasswordModal(true);
    } else if (name.includes("leg press")) {
      setCurrentVideoUrl("/exercicios/legPress/LegPress.mp4");
      setCurrentExerciseName(exerciseName);
      setShowPasswordModal(true);
    } else {
      toast.error("Vídeo de demonstração não disponível para este exercício.");
    }
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTraining && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTraining, startTime]);

  const treinosCards: Array<{
    tipo: TipoTreino;
    title: string;
    subtitle: string;
    focus: string;
    icon: "down" | "up";
  }> = useMemo(
    () => [
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
    setIsTraining(true);
    setStartTime(Date.now());
    setElapsedTime(0);
    setCompletedExercises([]);
  };

  const handleToggleExercise = (name: string) => {
    setCompletedExercises((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const handleFinishTraining = async () => {
    if (!selectedTipo) return;
    try {
      // Pega apenas os exercícios que foram marcados como concluídos
      const concluidos = (suggested as string[])
        .filter((ex) => completedExercises.includes(ex))
        .map((ex, idx) => ({
          nome: ex,
          series: getMeta(idx).sets,
          repeticoes: getMeta(idx).reps,
        }));

      if (concluidos.length === 0) {
        toast.error("Marque ao menos um exercício como concluído!");
        return;
      }

      const data = {
        tipo: selectedTipo,
        diaSemana: selectedDia,
        exerciciosRealizados: concluidos,
      };

      await finalizarTreino(data);
      toast.success("Treino salvo com sucesso!");
      setIsTraining(false);
      setStartTime(null);
      setElapsedTime(0);
      setCompletedExercises([]);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao finalizar e salvar o treino.");
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}:` : ""}${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="w-full px-5 pb-32 pt-6">
      
      {isTraining ? (
        /* TRAINING ACTIVE UI */
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <div className="lg:hidden w-9 h-9" />
            <div className="text-center">
              <div className="text-lg font-semibold tracking-widest text-emerald-400">
                TREINO ATIVO
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-400/10 px-3 py-1.5 text-emerald-400 ring-1 ring-emerald-400/20">
                <Timer size={14} />
                <span className="font-mono text-sm font-bold">{formatTime(elapsedTime)}</span>
              </div>
            </div>
          </div>

          {/* Timer Card */}
          <div className="flex flex-col items-center justify-center rounded-[28px] bg-white/5 p-8 ring-1 ring-white/10">
            <Timer size={32} className="text-emerald-400 mb-2" />
            <div className="text-4xl font-mono font-bold">{formatTime(elapsedTime)}</div>
            <div className="mt-2 text-sm text-white/50 tracking-widest uppercase">Tempo Decorrido</div>
          </div>

          {/* Exercises List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <h2 className="text-xl font-semibold col-span-full">Exercícios</h2>
            {suggested.map((name) => {
              const isCompleted = completedExercises.includes(name);
              return (
                <div
                  key={name}
                  className={`flex w-full items-center gap-4 rounded-2xl p-4 transition ${
                    isCompleted
                      ? "bg-emerald-400/10 ring-1 ring-emerald-400/30"
                      : "bg-white/5 ring-1 ring-white/10"
                  }`}
                >
                  <button
                    onClick={() => handleToggleExercise(name)}
                    className="flex flex-1 items-center gap-4 text-left"
                  >
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                        isCompleted ? "bg-emerald-400 border-emerald-400" : "border-white/20"
                      }`}
                    >
                      {isCompleted && <Check size={14} className="text-black" />}
                    </div>
                    <span
                      className={`font-medium ${
                        isCompleted ? "text-white/50 line-through" : "text-white"
                      }`}
                    >
                      {name}
                    </span>
                  </button>

                  <button
                    onClick={() => handleShowVideo(name)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-emerald-400 hover:bg-emerald-400/10 transition"
                    title="Ver demonstração"
                  >
                    <Play size={18} fill="currentColor" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleFinishTraining}
            className="mt-8 w-full rounded-2xl bg-emerald-400 py-4 text-sm font-bold tracking-widest text-black shadow-[0_18px_45px_rgba(16,185,129,0.25)]"
          >
            FINALIZAR TREINO
          </button>
        </div>
      ) : (
        /* NORMAL UI (CREATE/SELECT TREINO) */
        <>
          {/* Top bar */}
          <div className="flex items-center justify-between">
            <div className="lg:hidden w-9 h-9" /> {/* Espaçador para o botão de menu fixo no mobile */}

            <div className="text-center">
              <div className="text-lg font-semibold tracking-widest text-emerald-400">
                TRAINING
              </div>
            </div>

            <div className="flex items-center gap-2">
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
          </div>

          {/* Days */}
          <div className="mt-6 flex gap-3">
            {generatedDays.map((d) => {
              const active = selectedDia === d.key;
              return (
                <button
                  key={d.fullDate}
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
                  onClick={() => setSelectedTipo(c.tipo)}
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
                        active ? "bg-white/10 ring-white/25" : "bg-transparent ring-white/15",
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

          {/* Áreas-alvo */}
          <div className="mt-7 flex items-end justify-between">
            <h2 className="text-xl font-semibold">Áreas-alvo</h2>
            <div className="text-xs font-semibold tracking-widest text-emerald-400">
              {selectedGrupos.length} SELECIONADO
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
                    active
                      ? "shadow-[0_0_0_1px_rgba(16,185,129,0.45)]"
                      : "hover:bg-white/10",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-2 w-2 rounded-full",
                      active ? "bg-emerald-400" : "bg-white/25",
                    ].join(" ")}
                  />
                  <span className="text-sm font-medium capitalize">
                    {formatGrupoLabel(g)}
                  </span>
                </button>
              );
            })}
          </div>

          <h2 className="mt-8 text-xl font-semibold">Rotina sugerida</h2>
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
        </>
      )}

      {/* Ação flutuante */}
      {!isTraining && (
        <button
          type="button"
          onClick={handleStartTraining}
          className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400 text-black shadow-[0_18px_45px_rgba(16,185,129,0.35)]"
          aria-label="Iniciar"
        >
          <Play size={22} fill="currentColor" />
        </button>
      )}

      {/* Modal de Vídeo */}
      {showVideoModal && currentVideoUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[32px] bg-[#0b1220] border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-6 flex items-center justify-between border-b border-white/5">
              <h3 className="text-lg font-bold text-emerald-400 uppercase tracking-wider">
                {currentExerciseName}
              </h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentVideoUrl(null);
                }}
                className="p-2 rounded-full hover:bg-white/5 text-white/60 transition"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="relative aspect-video bg-black">
              <video
                src={currentVideoUrl}
                controls
                autoPlay
                loop
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-6 bg-white/5">
              <p className="text-xs text-white/40 text-center uppercase tracking-[0.2em]">
                Demonstração de execução correta
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
