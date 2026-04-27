"use client";

import { useEffect, useState } from "react";
import { getPerfil, listarHistorico } from "@/services/api";
import { useRouter } from "next/navigation";
import { useNav } from "@/components/navWrapper";
import {
  Activity,
  Calendar,
  ChevronDown,
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
  const router = useRouter();
  const { openSidebar } = useNav();
  const [historico, setHistorico] = useState<WorkoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

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
      const userStr = localStorage.getItem("usuario");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.sexo) setUserGender(user.sexo);
          if (user.fotoPerfil) setProfilePhoto(user.fotoPerfil);
        } catch { }
      }

      try {
        const perfil = await getPerfil();
        if (perfil?.sexo) setUserGender(perfil.sexo);
        if ("fotoPerfil" in (perfil ?? {})) setProfilePhoto(perfil.fotoPerfil ?? null);
      } catch { }

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

  const getProfileImage = () => {
    if (profilePhoto) return profilePhoto;
    if (userGender === "Feminino") {
      return "/imagens/perfil/feminino.png";
    } else {
      return "/imagens/perfil/masculino.png";
    }
  };

  /**
   * Formata uma string de data ISO para exibição compacta em pt-BR.
   *
   * Exibe apenas dia e mês abreviado, ideal para listagens onde o espaço é limitado.
   * Exemplo: "2024-06-15T14:30:00Z" → "15 de jun."
   */
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  /**
   * Formata uma duração em segundos para o formato MM:SS.
   *
   * Retorna "--:--" para valores nulos, undefined ou zerados,
   * evitando exibir "00:00" quando a duração não foi registrada.
   * Usa padStart para garantir sempre dois dígitos em minutos e segundos.
   * Exemplo: 185 → "03:05"
   */
  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) {
      return "--:--";
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleOpenFinishedWorkout = (item: WorkoutHistory) => {
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
  const totalMinutes = Math.floor((totalDuration % 3600) / 60);

  return (
    <div className="w-full px-4 pb-32 pt-4 sm:px-5 sm:pt-6">
      <div className="flex items-center justify-between">
        <button
          onClick={openSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        <div className="text-right">
          <div className="text-lg font-semibold tracking-[0.18em] uppercase text-emerald-400">
            Histórico
          </div>
        </div>
      </div>

      {/* Card de resumo mensal: exibe total de treinos, volume acumulado e tempo total */}
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
          {/* Exibe "--" quando não há volume registrado, evitando mostrar "0.0 kg" */}
          <div className="rounded-2xl bg-[#0f1a2f] p-3 ring-1 ring-white/5">
            <div className="text-[9px] uppercase tracking-[0.22em] text-white/35">
              Volume total
            </div>
            <div className="mt-1 text-xl font-bold text-emerald-300">
              {totalVolume > 0 ? `${totalVolume.toFixed(1)} kg` : "--"}
            </div>
          </div>
          {/* Exibe "--" quando não há duração registrada */}
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

      {/* Renderização condicional: spinner durante carregamento, estado vazio ou lista de treinos */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        </div>
      ) : historico.length === 0 ? (
        // Estado vazio: exibido quando o usuário ainda não registrou nenhum treino
        <div className="text-center py-20 bg-white/5 rounded-3xl ring-1 ring-white/10">
          <History size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/50">Nenhum treino realizado ainda.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {historico.map((item, index) => {
            /**
             * Converte a string de exercícios (separada por vírgula) em um array limpo.
             *
             * Usa trim() e filter(Boolean) para remover espaços extras e entradas vazias
             * que podem surgir de vírgulas duplicadas ou espaços no valor da API.
             * Serve como fallback quando as séries detalhadas não estão disponíveis.
             */
            const exercicios =
              item.ExerciciosRealizados?.trim()
                ? item.ExerciciosRealizados.split(",").map((s) => s.trim()).filter(Boolean)
                : [];

            // Seleciona o ícone do card com base na posição do treino na lista (ciclo de 4 ícones)
            const Icon = iconByIndex[index % iconByIndex.length];

            /**
             * Agrupa as séries do treino pelo nome do exercício.
             *
             * Transforma o array flat de séries em um objeto onde cada chave é o nome
             * do exercício e o valor é o array de séries correspondentes.
             * Isso permite exibir uma linha por exercício no detalhe expandido,
             * consolidando séries, repetições e melhor carga em uma única linha.
             */
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

            // Prioriza a contagem de exercícios agrupados pelas séries detalhadas;
            // cai para o array de nomes simples se as séries não estiverem disponíveis.
            const qtdExercicios = Object.keys(groupedSeries).length || exercicios.length;

            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-[24px] bg-[#101b30] ring-1 ring-white/10 transition-all duration-300 hover:bg-[#15233f]"
              >
                {/* Cabeçalho clicável do card: aciona o toggle de expansão ao clicar */}
                <button
                  onClick={() => handleOpenFinishedWorkout(item)}
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
                    <ChevronDown size={17} className="text-white/55" />
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}