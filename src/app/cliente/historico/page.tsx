"use client";

import { useEffect, useState } from "react";
import { listarHistorico } from "@/services/api";
import { useRouter } from "next/navigation";
import { Activity, ChevronDown, Clock, Dumbbell, Hand, History, Share2, Zap } from "lucide-react";

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
  <div className="flex flex-col gap-4 text-white">

    {/* ───────────────────────────── */}
    {/* HEADER DA PÁGINA */}
    {/* ───────────────────────────── */}

    <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        {/* Título + descrição */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Histórico
          </p>

          <h1 className="mt-1 text-3xl font-black text-white">
            Seus treinos realizados
          </h1>

          <p className="mt-1 text-sm text-white/40">
            Acompanhe sua evolução e desempenho nos treinos.
          </p>
        </div>

        {/* Badge do mês */}
        <div className="flex h-11 items-center rounded-2xl border border-white/10 bg-white/5 px-4">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            {new Date().toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>

    {/* ───────────────────────────── */}
    {/* CARDS DE RESUMO */}
    {/* ───────────────────────────── */}

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

      {/* Total de treinos */}
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Treinos
            </p>

            <p className="mt-2 text-4xl font-black text-emerald-400">
              {totalTreinos}
            </p>

            <p className="mt-1 text-xs text-white/30">
              sessões concluídas
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <History size={22} />
          </div>
        </div>
      </div>

      {/* Volume total */}
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Volume
            </p>

            <p className="mt-2 text-4xl font-black text-cyan-400">
              {totalVolume > 1000
                ? (totalVolume / 1000).toFixed(1)
                : totalVolume}
            </p>

            <p className="mt-1 text-xs text-white/30">
              {totalVolume > 1000 ? "toneladas" : "quilogramas"}
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
            <Dumbbell size={22} />
          </div>
        </div>
      </div>

      {/* Tempo total */}
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
              Tempo
            </p>

            <p className="mt-2 text-4xl font-black text-orange-400">
              {totalHours}
            </p>

            <p className="mt-1 text-xs text-white/30">
              horas treinadas
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
            <Clock size={22} />
          </div>
        </div>
      </div>
    </div>

    {/* ───────────────────────────── */}
    {/* LISTA DE TREINOS */}
    {/* ───────────────────────────── */}

    <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">

      {/* Header da seção */}
      <div className="mb-5 flex items-center justify-between">

        <div>
          <h2 className="text-lg font-bold text-white">
            Atividade recente
          </h2>

          <p className="mt-1 text-xs text-white/40">
            Últimos treinos registrados no sistema
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
          <Activity size={18} />
        </div>
      </div>

      {/* LOADING */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        </div>
      ) : historico.length === 0 ? (

        /* SEM TREINOS */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#0f172a] py-20">

          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-white/20">
            <History size={34} />
          </div>

          <h3 className="text-lg font-bold text-white/80">
            Nenhum treino encontrado
          </h3>

          <p className="mt-2 text-sm text-white/40">
            Seus treinos aparecerão aqui.
          </p>
        </div>

      ) : (

        /* LISTA */
        <div className="space-y-4">

          {historico.map((item, index) => {

            const exercicios =
              item.ExerciciosRealizados?.trim()
                ? item.ExerciciosRealizados
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                : [];

            const Icon = iconByIndex[index % iconByIndex.length];

            const displayExercisesPreview =
              exercicios.slice(0, 3).join(", ") +
              (exercicios.length > 3
                ? `, +${exercicios.length - 3}`
                : "");

            const isExpanded = expandedWorkout === item.id;

            const groupedSeries = (item.series ?? []).reduce<
              Record<string, NonNullable<WorkoutHistory["series"]>>
            >((acc, serie) => {

              const key = serie.exercicioNome || "Exercício";

              if (!acc[key]) {
                acc[key] = [];
              }

              acc[key].push(serie);

              return acc;

            }, {});

            return (

              <div
                key={item.id}
                className="
                  overflow-hidden
                  rounded-2xl
                  border
                  border-white/10
                  bg-[#0f172a]
                  transition-all
                  hover:border-emerald-500/20
                "
              >

                {/* Card clicável */}
                <div
                  onClick={() => toggleWorkoutExpansion(item.id)}
                  className="cursor-pointer p-5"
                >

                  <div className="flex items-center gap-4">

                    {/* Ícone */}
                    <div className="
                      flex
                      h-14
                      w-14
                      shrink-0
                      items-center
                      justify-center
                      rounded-2xl
                      bg-emerald-500/10
                    ">
                      <Icon
                        size={24}
                        className={
                          isExpanded
                            ? "text-emerald-400"
                            : "text-emerald-400/70"
                        }
                      />
                    </div>

                    {/* Conteúdo */}
                    <div className="min-w-0 flex-1">

                      <h3 className="truncate text-lg font-bold text-white">
                        {item.NomeTreino}
                      </h3>

                      <div className="mt-1 flex items-center gap-2 text-xs text-white/40">

                        <span>
                          {formatDate(item.dataTreino)}
                        </span>

                        <span>•</span>

                        <span>
                          {Math.floor(
                            (item.duracaoSegundos ?? 0) / 60
                          )} min
                        </span>
                      </div>

                      {!isExpanded && (
                        <p className="mt-2 truncate text-xs italic text-white/30">
                          {displayExercisesPreview}
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-3">

                      <button
                        onClick={(e) =>
                          handleOpenPerformanceScreen(e, item)
                        }
                        className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-xl
                          bg-emerald-500/10
                          text-emerald-400
                          transition
                          hover:bg-emerald-500/20
                        "
                      >
                        <Share2 size={17} />
                      </button>

                      <ChevronDown
                        size={20}
                        className={`
                          transition-transform duration-300
                          ${isExpanded
                            ? "rotate-180 text-emerald-400"
                            : "text-white/20"}
                        `}
                      />
                    </div>
                  </div>

                  {/* DETALHES */}
                  {isExpanded && (

                    <div className="mt-5 border-t border-white/5 pt-5">

                      <div className="mb-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/70">
                          Exercícios realizados
                        </p>
                      </div>

                      <div className="space-y-3">

                        {Object.entries(groupedSeries).length > 0 ? (

                          Object.entries(groupedSeries).map(
                            ([name, series]) => (

                              <div
                                key={name}
                                className="
                                  flex
                                  items-center
                                  justify-between
                                  rounded-xl
                                  border
                                  border-white/5
                                  bg-white/[0.03]
                                  p-3
                                "
                              >

                                <div>
                                  <p className="text-sm font-semibold text-white">
                                    {name}
                                  </p>

                                  <p className="mt-1 text-xs text-white/30">
                                    {series.length} séries
                                  </p>
                                </div>

                                <div className="text-right">

                                  <p className="text-sm font-bold text-emerald-400">
                                    {Math.max(
                                      ...series.map(
                                        (s) => Number(s.carga) || 0
                                      )
                                    )}kg
                                  </p>

                                  <p className="text-[10px] text-white/30">
                                    maior carga
                                  </p>
                                </div>
                              </div>
                            )
                          )

                        ) : (

                          exercicios.map((name, i) => (

                            <div
                              key={i}
                              className="
                                rounded-xl
                                border
                                border-white/5
                                bg-white/[0.03]
                                p-3
                              "
                            >
                              <span className="text-sm text-white/90">
                                {name}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);
}