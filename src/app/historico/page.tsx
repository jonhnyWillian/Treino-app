"use client";

import { useEffect, useState } from "react";
import { listarHistorico } from "@/services/api";
import {
  Activity,
  Calendar,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Hand,
  History,
  Menu,
  Zap,
} from "lucide-react";
import Image from "next/image";

interface WorkoutHistory {
  id: number;
  NomeTreino: string;
  dataTreino: string;
  duracaoSegundos?: number | null;
  ExerciciosRealizados: string;
  series?: {
    id: number;
    exercicioId: number;
    exercicioNome: string;
    numeroSerie: number;
    carga: number | null;
    repeticoesFeitas: number;
    concluida: boolean;
    observacao: string | null;
  }[];
}

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<WorkoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await listarHistorico();
        setHistorico(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
        setHistorico([]);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const iconByIndex = [Dumbbell, Zap, Hand, Activity];
  const totalTreinos = historico.length;
  const totalVolume = historico.reduce((acc, item) => {
    const cargaDoTreino = (item.series ?? []).reduce(
      (sum, serie) => sum + (Number(serie.carga) || 0),
      0,
    );
    return acc + cargaDoTreino;
  }, 0);
  const totalDuration = historico.reduce(
    (acc, item) => acc + (item.duracaoSegundos ?? 0),
    0,
  );
  const totalHours = Math.floor(totalDuration / 3600);
  const totalMinutes = Math.floor((totalDuration % 3600) / 60);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-32 pt-4 sm:px-5 sm:pt-6">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2 text-emerald-400">
          <Menu size={16} />
          <div className="text-lg font-semibold tracking-[0.18em] uppercase">
            Histórico
          </div>
        </div>

        <div className="relative h-9 w-9 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
          <Image src="/login-bg.jpg" alt="Perfil" fill className="object-cover opacity-90" />
        </div>
      </div>

      <div className="mt-6 rounded-[28px] bg-[#111d33] p-5 ring-1 ring-white/10">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-300/70">
              Desempenho mensal
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <span className="text-4xl font-extrabold leading-none sm:text-5xl">{totalTreinos}</span>
              <span className="pb-1 text-white/65">Treinos concluídos</span>
            </div>
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-white/35">
            <Calendar size={26} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#0f1a2f] p-3 ring-1 ring-white/5">
            <div className="text-[9px] uppercase tracking-[0.22em] text-white/35">
              Volume total
            </div>
            <div className="mt-1 text-xl font-bold text-emerald-300">
              {totalVolume > 0 ? `${totalVolume.toFixed(1)} kg` : "--"}
            </div>
          </div>
          <div className="rounded-2xl bg-[#0f1a2f] p-3 ring-1 ring-white/5">
            <div className="text-[9px] uppercase tracking-[0.22em] text-white/35">
              Tempo total
            </div>
            <div className="mt-1 text-xl font-bold text-emerald-300">
              {totalDuration > 0 ? `${totalHours}h ${totalMinutes}m` : "--"}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        </div>
      ) : historico.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl ring-1 ring-white/10">
          <History size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/50">Nenhum treino realizado ainda.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {historico.map((item, index) => {
            const isExpanded = expandedId === item.id;
            const exercicios =
              item.ExerciciosRealizados?.trim()
                ? item.ExerciciosRealizados.split(",").map((s) => s.trim()).filter(Boolean)
                : [];
            const Icon = iconByIndex[index % iconByIndex.length];
            const groupedSeries = (item.series ?? []).reduce<
              Record<string, NonNullable<WorkoutHistory["series"]>>
            >(
              (acc, serie) => {
                const key = serie.exercicioNome || "Exercício";
                if (!acc[key]) acc[key] = [];
                acc[key].push(serie);
                return acc;
              },
              {},
            );
            const qtdExercicios = Object.keys(groupedSeries).length || exercicios.length;

            return (
              <div
                key={item.id}
                className={`overflow-hidden rounded-[24px] bg-[#101b30] ring-1 ring-white/10 transition-all duration-300 ${
                  isExpanded ? "ring-emerald-400/35" : "hover:bg-[#15233f]"
                }`}
              >
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="flex w-full flex-wrap items-start justify-between gap-3 p-4 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/20">
                      <Icon size={18} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="truncate text-lg font-semibold leading-tight text-white/95 sm:text-[20px] sm:leading-none">
                        {item.NomeTreino}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-white/50">
                        <Calendar size={12} />
                        {formatDate(item.dataTreino)} - {formatDuration(item.duracaoSegundos)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[9px] uppercase tracking-[0.2em] text-white/45">
                        Exercícios
                      </div>
                      <div className="text-2xl font-bold leading-none text-emerald-300">
                        {qtdExercicios}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={17} className="text-white/55" />
                    ) : (
                      <ChevronDown size={17} className="text-white/55" />
                    )}
                  </div>
                </button>

                <div
                  className={`overflow-x-auto overflow-y-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? "max-h-[560px] opacity-100 px-4 pb-4" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="rounded-2xl bg-[#0d172a] p-3 ring-1 ring-white/5">
                    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-2 pb-2 text-[9px] uppercase tracking-[0.15em] text-white/35">
                      <div>Exercicio</div>
                      <div>Series</div>
                      <div>Reps</div>
                      <div>Peso</div>
                    </div>
                    <div className="space-y-2">
                      {Object.keys(groupedSeries).length > 0
                        ? Object.entries(groupedSeries).map(([exerciseName, exerciseSeries]) => {
                            const totalSeries = exerciseSeries.length;
                            const doneSeries = exerciseSeries.filter((s) => s.concluida).length;
                            const reps = exerciseSeries[0]?.repeticoesFeitas ?? 0;
                            const bestCarga = Math.max(...exerciseSeries.map((s) => Number(s.carga) || 0));

                            return (
                              <div
                                key={exerciseName}
                                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 rounded-xl bg-white/5 p-2.5"
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-white/90">{exerciseName}</div>
                                  <div className="text-[9px] uppercase tracking-[0.12em] text-white/35">
                                    foco: executado
                                  </div>
                                </div>
                                <div className="text-sm font-semibold text-white/75">{doneSeries}/{totalSeries}</div>
                                <div className="text-sm font-semibold text-white/75">{reps || "--"}</div>
                                <div className="text-sm font-semibold text-emerald-300">
                                  {bestCarga > 0 ? `${bestCarga}kg` : "--"}
                                </div>
                              </div>
                            );
                          })
                        : exercicios.map((ex, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-xl bg-white/5 p-2.5"
                            >
                              <span className="truncate text-sm text-white/80">{ex}</span>
                              <span className="text-xs text-white/40">--</span>
                            </div>
                          ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
