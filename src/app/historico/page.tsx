"use client";

import { useEffect, useState } from "react";
import { listarHistorico } from "@/services/api";
import { useRouter } from "next/navigation";
import { useNav } from "@/components/navWrapper";
import {
  Activity,
  ChevronDown,
  Clock,
  Dumbbell,
  Hand,
  History,
  Menu,
  Share2,
  Zap,
} from "lucide-react";
//import Image from "next/image";

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
  const router = useRouter();
  const { openSidebar } = useNav();
  const [historico, setHistorico] = useState<WorkoutHistory[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Carrega o histórico de treinos ao montar o componente.
   *
   * Chama a API e valida se a resposta é um array antes de salvar no estado,
   * evitando erros caso a API retorne um formato inesperado.
   * Em caso de falha, reseta o histórico para array vazio para não quebrar a renderização.
   * O bloco `finally` garante que o loading seja desativado em qualquer cenário.
   */
  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const data = await listarHistorico();
        setHistorico(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
        setHistorico([]);
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const [expandedWorkout, setExpandedWorkout] = useState<number | null>(null);

  const toggleWorkoutExpansion = (id: number) => {
    setExpandedWorkout(expandedWorkout === id ? null : id);
  };

  const handleOpenPerformanceScreen = (e: React.MouseEvent, item: WorkoutHistory) => {
    e.stopPropagation();

    // Calcula o volume total e séries para o resumo
    const totalVolume = (item.series ?? []).reduce((sum, s) => sum + (Number(s.carga) || 0), 0);
    const totalSeries = (item.series ?? []).length;

    const groupedSeries = (item.series ?? []).reduce<
      Record<string, NonNullable<WorkoutHistory["series"]>>
    >((acc, serie) => {
      const key = serie.exercicioNome || "Exercício";
      if (!acc[key]) acc[key] = [];
      acc[key].push(serie);
      return acc;
    }, {});

    const fallbackExercises =
      item.ExerciciosRealizados?.trim()
        ? item.ExerciciosRealizados.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    const exercisesFromSeries = Object.entries(groupedSeries).map(([exerciseName, exerciseSeries]) => ({
      nome: exerciseName,
      series: exerciseSeries.length,
      repeticoes: String(exerciseSeries[0]?.repeticoesFeitas ?? "--"),
      carga: Math.max(...exerciseSeries.map((s) => Number(s.carga) || 0)) || null,
    }));

    const exercises =
      exercisesFromSeries.length > 0
        ? exercisesFromSeries
        : fallbackExercises.map((exerciseName) => ({
          nome: exerciseName,
          series: 0,
          repeticoes: "--",
          carga: null,
        }));

    const summary = {
      nomeTreino: item.NomeTreino,
      dataTreino: item.dataTreino,
      duracaoSegundos: item.duracaoSegundos ?? 0,
      totalVolume: totalVolume,
      totalSeries: totalSeries,
      exercicios: exercises,
    };

    sessionStorage.setItem("ATIVOFinishedWorkout", JSON.stringify(summary));
    router.push("/treinoFinalizado?source=historico");
  };

  // Array de ícones rotacionados por índice para diferenciar visualmente cada card de treino.
  // O operador módulo (%) garante que o ciclo recomece após o último ícone.
  const iconByIndex = [Dumbbell, Zap, Hand, Activity];

  // Total de treinos registrados no histórico — usado no card de desempenho mensal.
  const totalTreinos = historico.length;

  /**
   * Calcula o volume total levantado em todos os treinos do histórico.
   *
   * Percorre cada treino e soma a carga de todas as séries.
   * Usa Number() para converter carga, pois pode vir como string da API.
   * O fallback `|| 0` garante que valores nulos não quebrem a soma.
   */
  const totalVolume = historico.reduce((acc, item) => {
    const cargaDoTreino = (item.series ?? []).reduce(
      (sum, serie) => sum + (Number(serie.carga) || 0),
      0,
    );
    return acc + cargaDoTreino;
  }, 0);

  // Soma a duração total de todos os treinos em segundos para calcular horas e minutos exibidos no card.
  const totalDuration = historico.reduce(
    (acc, item) => acc + (item.duracaoSegundos ?? 0),
    0,
  );
  const totalHours = Math.floor(totalDuration / 3600);

  return (
    <div className="w-full px-4 pb-32 pt-4 sm:px-6 sm:pt-6 bg-[#0a0f18] min-h-screen text-white">
      {/* Header Estilizado */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={openSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10"
        >
          <Menu size={20} className="text-emerald-400" />
        </button>

        <h1 className="text-2xl font-bold text-emerald-400">Histórico</h1>

        <div className="w-10" /> {/* Espaçador para manter o título centralizado */}
      </div>

      {/* Monthly Summary Section */}
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Resumo Mensal</h2>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
          {new Date().toLocaleDateString("pt-br", { month: "long" })}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-4">
        <div className="rounded-[32px] bg-[#111d33] p-8 ring-1 ring-white/10">
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
            Treinos Concluídos
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-black text-emerald-400">{totalTreinos}</span>
            <span className="text-xl font-bold text-white/60">sessões</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="rounded-[32px] bg-[#111d33] p-6 ring-1 ring-white/10">
          <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-500/20 mb-4">
            <Dumbbell size={20} className="text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-2xl font-bold text-white">
              {totalVolume > 1000 ? (totalVolume / 1000).toFixed(1) : totalVolume}
            </span>
            <span className="text-xs font-bold text-emerald-400 uppercase">
              {totalVolume > 1000 ? "t" : "kg"}
            </span>
          </div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">
            Total Volume
          </div>
        </div>

        <div className="rounded-[32px] bg-[#111d33] p-6 ring-1 ring-white/10">
          <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-500/20 mb-4">
            <Clock size={20} className="text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1 mb-1">
            <span className="text-2xl font-bold text-white">{totalHours}</span>
            <span className="text-xs font-bold text-emerald-400 uppercase">h</span>
          </div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-white/40">
            Tempo total
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Atividade recente</h2>       
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
        <div className="space-y-4">
          {historico.map((item, index) => {
            const exercicios =
              item.ExerciciosRealizados?.trim()
                ? item.ExerciciosRealizados.split(",").map((s) => s.trim()).filter(Boolean)
                : [];

            const Icon = iconByIndex[index % iconByIndex.length];
            const displayExercisesPreview = exercicios.slice(0, 3).join(", ") + (exercicios.length > 3 ? `, +${exercicios.length - 3} more` : "");
            const isExpanded = expandedWorkout === item.id;

            // Agrupamento para exibição detalhada inline
            const groupedSeries = (item.series ?? []).reduce<
              Record<string, NonNullable<WorkoutHistory["series"]>>
            >((acc, serie) => {
              const key = serie.exercicioNome || "Exercício";
              if (!acc[key]) acc[key] = [];
              acc[key].push(serie);
              return acc;
            }, {});

            return (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-[32px] bg-[#111d33] ring-1 ring-white/10 transition-all duration-300 hover:bg-[#1a263d]"
              >
                <div
                  onClick={() => toggleWorkoutExpansion(item.id)}
                  className="p-5 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {/* Ícone estilizado conforme imagem */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                      <Icon size={24} className={isExpanded ? "text-emerald-400" : "text-emerald-400/60"} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white truncate mb-1">
                        {item.NomeTreino}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-white/40 mb-1">
                        <span>{formatDate(item.dataTreino)}</span>
                        <span>•</span>
                        <span>{Math.floor((item.duracaoSegundos ?? 0) / 60)} min</span>
                      </div>
                      {!isExpanded && (
                        <p className="text-[11px] text-white/30 italic truncate">
                          {displayExercisesPreview}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => handleOpenPerformanceScreen(e, item)}
                        className="p-2 rounded-full bg-emerald-400/10 hover:bg-emerald-400/20 text-emerald-400 transition-colors"
                        title="Compartilhar / Performance"
                      >
                        <Share2 size={18} />
                      </button>
                      <ChevronDown
                        size={20}
                        className={`text-white/20 transition-transform duration-300 ${isExpanded ? "rotate-180 text-emerald-400" : ""}`}
                      />
                    </div>
                  </div>

                  {/* Detalhes dos Exercícios (Exibição Inline) */}
                  {isExpanded && (
                    <div className="mt-6 space-y-3 border-t border-white/5 pt-4">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60 mb-3">
                        Exercícios Realizados
                      </div>
                      {Object.entries(groupedSeries).length > 0 ? (
                        Object.entries(groupedSeries).map(([name, series]) => (
                          <div key={name} className="flex items-center justify-between rounded-xl bg-white/5 p-3 ring-1 ring-white/5">
                            <span className="text-sm font-medium text-white/90">{name}</span>
                            <div className="flex items-center gap-3 text-xs text-white/40">
                              <span className="bg-white/5 px-2 py-1 rounded-md">{series.length} séries</span>
                              <span className="text-emerald-400/60 font-bold">
                                {Math.max(...series.map(s => Number(s.carga) || 0))}kg
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        exercicios.map((name, i) => (
                          <div key={i} className="flex items-center justify-between rounded-xl bg-white/5 p-3 ring-1 ring-white/5">
                            <span className="text-sm font-medium text-white/90">{name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}