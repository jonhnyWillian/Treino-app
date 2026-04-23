"use client";

import Image from "next/image";
import { treinos, TipoTreino } from "@/data/treinos";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Play, X } from "lucide-react";
import { finalizarTreino, getPerfil } from "@/services/api";
import toast from "react-hot-toast";

/**
 * Tipo que representa a configuração do treino salva no sessionStorage.
 * É preenchida na tela anterior (Treino/Page.tsx) e lida aqui para montar os exercícios.
 */
type TrainingConfig = {
  tipo: TipoTreino;
  diaSemana: string;
  grupos: string[];
};

type FinishedWorkoutSummary = {
  nomeTreino: string;
  dataTreino: string;
  duracaoSegundos: number;
  exercicios: {
    nome: string;
    series: number;
    repeticoes: string;
    carga: number | null;
  }[];
};

export default function TreinoExecucaoPage() {
  const router = useRouter();

  // Gênero do usuário — controla qual foto de perfil exibir
  const [userGender, setUserGender] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // Configuração do treino lida do sessionStorage (tipo, dia e grupos musculares)
  const [config, setConfig] = useState<TrainingConfig | null>(null);

  // Timestamp de início do treino — usado para calcular o tempo decorrido
  const [startTime, setStartTime] = useState<number | null>(null);

  // Tempo decorrido em segundos desde o início do treino
  const [elapsedTime, setElapsedTime] = useState(0);

  // Lista de exercícios marcados como concluídos pelo usuário
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);

  // Controla a exibição do modal de vídeo de demonstração
  const [showVideoModal, setShowVideoModal] = useState(false);

  // URL do vídeo de demonstração atualmente exibido no modal
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);

  // Nome do exercício sendo demonstrado no modal de vídeo
  const [currentExerciseName, setCurrentExerciseName] = useState("");

  // Dados inseridos pelo usuário para cada exercício: peso, repetições e séries
  const [exerciseData, setExerciseData] = useState<Record<string, { peso: string; reps: string; series: string }>>({});

  /**
   * Inicializa os dados do treino ao montar o componente.
   * Lê o gênero do usuário no localStorage e a configuração do treino no sessionStorage.
   * Redireciona para /treino se a configuração estiver ausente ou inválida.
   * O setTimeout evita erros de hidratação no React 19.
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

      const configStr = sessionStorage.getItem("ATIVOTrainingConfig");
      if (!configStr) {
        toast.error("Configure o treino antes de iniciar.");
        router.replace("/treino");
        return;
      }

      try {
        const parsed = JSON.parse(configStr) as TrainingConfig;
        if (!parsed.tipo || !parsed.diaSemana || !Array.isArray(parsed.grupos) || parsed.grupos.length === 0) {
          throw new Error("Configuração inválida");
        }
        setConfig(parsed);
        setStartTime(Date.now());
      } catch {
        toast.error("Não foi possível recuperar os dados do treino.");
        router.replace("/treino");
      }
    }, 0);

    return () => clearTimeout(timeout);
  }, [router]);

  /**
   * Keep-alive da sessão durante o treino em execução.
   *
   * Enquanto esta tela estiver aberta, faz uma chamada periódica à API para
   * evitar expiração por inatividade em backends com expiração deslizante.
   * Se a sessão já tiver expirado, o fluxo padrão de autenticação da API
   * continua responsável pelo redirecionamento para login.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      void getPerfil().catch(() => {
        // Falha é tratada no fluxo global de autenticação.
      });
    }, 4 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Cronômetro do treino — atualiza o tempo decorrido a cada segundo.
   * Só inicia quando o startTime é definido (após carregar a configuração).
   * Limpa o intervalo ao desmontar o componente para evitar memory leaks.
   */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [startTime]);

  /**
   * Retorna o caminho da imagem de perfil com base no gênero do usuário.
   * Padrão: imagem masculina caso o gênero não esteja definido.
   */
  const getProfileImage = () => {
    if (userGender === "Feminino") {
      return "/imagens/perfil/feminino.png";
    } else {
      return "/imagens/perfil/masculino.png";
    }
  };

  /**
   * Gera a lista de exercícios sugeridos com base nos grupos musculares da configuração.
   * Combina exercícios de todos os grupos e remove duplicatas com Set.
   * Recalcula apenas quando a configuração muda.
   */
  const suggested = useMemo(() => {
    if (!config?.tipo) return [];
    return Array.from(
      new Set(
        config.grupos.flatMap((g) => {
          const list = treinos[config.tipo]?.[g as keyof (typeof treinos)[typeof config.tipo]];
          return Array.isArray(list) ? (list as string[]) : [];
        }),
      ),
    );
  }, [config]);

  // Limita a lista a 7 exercícios e conta quantos foram concluídos
  const activeTrainingExercises = suggested.slice(0, 7);
  const completedCount = activeTrainingExercises.filter((name) => completedExercises.includes(name)).length;

  /**
   * Retorna metadados de séries e repetições para cada exercício.
   * Usa o índice para variar as configurações ciclicamente entre 4 padrões.
   * "PASSOS" é usado para exercícios como afundo (em vez de repetições).
   */
  const getMeta = (idx: number) => {
    const sets = [4, 3, 3, 4][idx % 4];
    const reps = ["10-12", "15", "12", "20"][idx % 4];
    const suffix = idx % 4 === 3 ? "PASSOS" : "REPS";
    return { sets, reps, suffix };
  };

  /**
   * Alterna o estado de conclusão de um exercício.
   * Se já está concluído, desmarca. Caso contrário, marca como concluído.
   */
  const handleToggleExercise = (name: string) => {
    setCompletedExercises((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  /**
   * Atualiza o campo (peso, reps ou séries) de um exercício específico.
   * Mantém os valores dos outros campos intactos usando spread do estado anterior.
   * Necessário para edição granular sem sobrescrever os demais campos do exercício.
   */
  const handleExerciseFieldChange = (
    exerciseName: string,
    field: "peso" | "reps" | "series",
    value: string,
  ) => {
    setExerciseData((prev) => ({
      ...prev,
      [exerciseName]: {
        peso: prev[exerciseName]?.peso ?? "",
        reps: prev[exerciseName]?.reps ?? "",
        series: prev[exerciseName]?.series ?? "",
        [field]: value,
      },
    }));
  };

  /**
   * Exibe o modal de demonstração em vídeo para o exercício selecionado.
   * Verifica se existe vídeo disponível para o exercício pelo nome.
   * Exibe toast de aviso se não houver vídeo cadastrado para o exercício.
   */
  const handleShowVideo = (exerciseName: string) => {
    const name = exerciseName.toLowerCase();

    if (name.includes("agachamento livre")) {
      setCurrentVideoUrl("/exercicios/agachamentoLivre/agachamentoLivre.mp4");
      setCurrentExerciseName(exerciseName);
      setShowVideoModal(true);
    } else if (name.includes("leg press")) {
      setCurrentVideoUrl("/exercicios/legPress/LegPress.mp4");
      setCurrentExerciseName(exerciseName);
      setShowVideoModal(true);
    } else {
      toast.error("Vídeo de demonstração não disponível para este exercício.");
    }
  };

  /**
   * Finaliza e salva o treino na API.
   * Coleta apenas os exercícios marcados como concluídos e monta o payload completo
   * com séries executadas, carga, repetições e tempo de descanso padrão.
   * Remove a configuração do sessionStorage e redireciona para o dashboard após salvar.
   * Exibe toast de erro se nenhum exercício foi concluído ou se a API falhar.
   */
  const handleFinishTraining = async () => {
    if (!config?.tipo) return;

    try {
      const concluidos = activeTrainingExercises
        .filter((ex) => completedExercises.includes(ex))
        .map((ex, idx) => {
          const defaults = getMeta(idx);
          const values = exerciseData[ex] ?? { peso: "", reps: "", series: "" };
          const series = Number(values.series) || defaults.sets;
          const repeticoes = values.reps || defaults.reps;
          const carga = values.peso ? Number(values.peso.replace(",", ".")) : null;
          const descansoSegundos = 60;

          return {
            nome: ex,
            series,
            repeticoes,
            carga,
            descansoSegundos,
            ordem: idx + 1,
            seriesExecutadas: Array.from({ length: series }, (_, i) => ({
              numeroSerie: i + 1,
              carga,
              repeticoesFeitas: Number(String(repeticoes).split("-")[0]) || 0,
              concluida: true,
              observacao: null,
            })),
          };
        });

      if (concluidos.length === 0) {
        toast.error("Marque ao menos um exercício como concluído!");
        return;
      }

      await finalizarTreino({
        tipo: config.tipo,
        diaSemana: config.diaSemana,
        duracaoSegundos: elapsedTime,
        exerciciosRealizados: concluidos,
      });

      const finishedSummary: FinishedWorkoutSummary = {
        nomeTreino: `${config.tipo.charAt(0).toUpperCase()}${config.tipo.slice(1)} - ${config.diaSemana}`,
        dataTreino: new Date().toISOString(),
        duracaoSegundos: elapsedTime,
        exercicios: concluidos.map((exercise) => ({
          nome: exercise.nome,
          series: exercise.series ?? 0,
          repeticoes: String(exercise.repeticoes ?? "--"),
          carga: exercise.carga ? Number(exercise.carga) : null,
        })),
      };

      sessionStorage.setItem("ATIVOFinishedWorkout", JSON.stringify(finishedSummary));
      sessionStorage.removeItem("ATIVOTrainingConfig");
      toast.success("Treino salvo com sucesso!");
      router.push("/treinoFinalizado?source=execucao");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao finalizar e salvar o treino.");
    }
  };

  /**
   * Formata segundos em string legível no formato MM:SS ou HH:MM:SS.
   * Inclui horas apenas quando o treino ultrapassa 60 minutos.
   * Adiciona zero à esquerda para manter o formato consistente.
   */
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}:` : ""}${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Exibe estado de carregamento enquanto a configuração do treino não foi lida
  if (!config) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-4 sm:px-5 sm:pt-6">
        <div className="text-center text-white/70">Carregando treino...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-4 sm:px-5 sm:pt-6">
      <div className="flex flex-col">

        {/* Barra superior — botão de fechar, título e foto de perfil */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/treino")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-emerald-400 ring-1 ring-white/10"
            aria-label="Fechar treino ativo"
          >
            <X size={18} />
          </button>

          <div className="text-lg font-semibold uppercase tracking-wide text-emerald-400">
            TREINO DIÁRIO
          </div>

          <div className="flex items-center gap-2">
            <div className="relative h-9 w-9 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
              <Image
                src={profilePhoto || getProfileImage()}
                alt="Foto de perfil"
                fill
                sizes="36px"
                className="object-cover opacity-90"
                priority
              />
            </div>

          </div>
        </div>

        {/* Cronômetro circular — exibe o tempo decorrido e o status do treino */}
        <div className="mt-6 flex justify-center">
          <div className="relative flex h-56 w-56 items-center justify-center rounded-full ring-1 ring-white/10">
            <div className="absolute inset-[14px] rounded-full ring-1 ring-blue-400/20" />
            <div className="absolute -top-1 left-1/2 h-2.5 w-20 -translate-x-1/2 rounded-full bg-blue-500/90 blur-[0.2px]" />
            <div className="text-center">
              <div className="font-mono text-4xl font-bold tracking-tight text-white/90 sm:text-6xl">
                {formatTime(elapsedTime)}
              </div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#132341] px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60 ring-1 ring-white/10">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                Status: Ativo
              </div>
            </div>
          </div>
        </div>

        {/* Cabeçalho da lista de exercícios com contador de conclusão */}
        <div className="mt-8 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-semibold uppercase tracking-wide sm:text-2xl">Exercícios</h2>
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/70 sm:text-xs sm:tracking-[0.18em]">
            {completedCount} / {activeTrainingExercises.length} Completos
          </div>
        </div>

        {/* Lista de exercícios — cada card permite marcar como concluído e inserir dados */}
        <div className="mt-4 space-y-3">
          {activeTrainingExercises.map((name, idx) => {
            const isCompleted = completedExercises.includes(name);

            // Exercício atual: o próximo não concluído na sequência
            const isCurrent = idx === completedCount && !isCompleted;
            const values = exerciseData[name] ?? { peso: "", reps: "", series: "" };

            return (
              <div
                key={name}
                className={[
                  "rounded-3xl p-4 transition",
                  isCompleted ? "bg-[#0f1a30] opacity-65 ring-1 ring-white/5" : "bg-[#101c34] ring-1 ring-white/10",
                  isCurrent ? "shadow-[0_0_0_1px_rgba(59,130,246,0.75),inset_3px_0_0_0_rgba(59,130,246,0.95)]" : "",
                ].join(" ")}
              >
                {/* Linha superior: nome do exercício e botão de marcar como concluído */}
                <div className="flex items-center justify-between">
                  <div className="flex min-w-0 items-center gap-3 text-left">
                    <span
                      className={[
                        "flex h-5 w-5 items-center justify-center rounded-full border transition",
                        isCompleted
                          ? "border-white/30 bg-white/15 text-white/85"
                          : isCurrent
                            ? "border-blue-400 bg-blue-400/20"
                            : "border-white/20",
                      ].join(" ")}
                    >
                      {isCompleted ? <Check size={12} /> : null}
                    </span>
                    <span
                      className={[
                        "truncate text-lg font-semibold leading-tight sm:text-2xl",
                        isCompleted ? "text-white/35 line-through" : "text-white/90",
                      ].join(" ")}
                    >
                      {name}
                    </span>
                  </div>

                  {/* Botão dedicado apenas a marcar/desmarcar o exercício como concluído */}
                  <button
                    onClick={() => handleToggleExercise(name)}
                    className={[
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      isCompleted
                        ? "bg-white/10 text-white/75"
                        : isCurrent
                          ? "bg-blue-500 text-white"
                          : "bg-blue-500/20 text-blue-400",
                    ].join(" ")}
                    title={isCompleted ? "Desmarcar exercício" : "Marcar exercício como concluído"}
                  >
                    {isCompleted ? (
                      <Check size={16} />
                    ) : (
                      <Check size={14} />
                    )}
                  </button>
                </div>

                {/* Ação de vídeo separada do check para permitir assistir sem concluir o exercício */}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => handleShowVideo(name)}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-300 ring-1 ring-blue-400/30 transition hover:bg-blue-500/30"
                    title="Ver demonstração do exercício"
                  >
                    <Play size={12} fill="currentColor" />
                    Ver vídeo
                  </button>
                </div>

                {/* Campos de entrada: peso, repetições e séries do exercício */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <label className="text-[10px] uppercase tracking-[0.15em] text-white/40">
                    Peso (kg)
                    <input
                      type="text"
                      value={values.peso}
                      onChange={(e) => handleExerciseFieldChange(name, "peso", e.target.value)}
                      disabled={isCompleted}
                      placeholder="--"
                      className="mt-1 h-10 w-full rounded-xl border border-white/5 bg-[#0b1426] px-3 text-sm text-white/80 outline-none transition placeholder:text-white/25 focus:border-blue-400/50 disabled:opacity-60"
                    />
                  </label>
                  <label className="text-[10px] uppercase tracking-[0.15em] text-white/40">
                    Repetições
                    <input
                      type="text"
                      value={values.reps}
                      onChange={(e) => handleExerciseFieldChange(name, "reps", e.target.value)}
                      disabled={isCompleted}
                      placeholder="--"
                      className="mt-1 h-10 w-full rounded-xl border border-white/5 bg-[#0b1426] px-3 text-sm text-white/80 outline-none transition placeholder:text-white/25 focus:border-blue-400/50 disabled:opacity-60"
                    />
                  </label>
                  <label className="text-[10px] uppercase tracking-[0.15em] text-white/40">
                    Séries
                    <input
                      type="text"
                      value={values.series}
                      onChange={(e) => handleExerciseFieldChange(name, "series", e.target.value)}
                      disabled={isCompleted}
                      placeholder="--"
                      className="mt-1 h-10 w-full rounded-xl border border-white/5 bg-[#0b1426] px-3 text-sm text-white/80 outline-none transition placeholder:text-white/25 focus:border-blue-400/50 disabled:opacity-60"
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        {/* Botão de finalizar treino — envia os dados para a API */}
        <button
          onClick={handleFinishTraining}
          className="mt-8 w-full rounded-2xl bg-emerald-400 py-4 text-sm font-bold tracking-widest text-black shadow-[0_18px_45px_rgba(16,185,129,0.25)]"
        >
          FINALIZAR TREINO
        </button>
      </div>

      {/* Modal de vídeo de demonstração — exibido ao clicar em Play em um exercício */}
      {showVideoModal && currentVideoUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg overflow-hidden rounded-[32px] border border-white/10 bg-[#0b1220] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 p-6">
              <h3 className="text-lg font-bold uppercase tracking-wider text-emerald-400">
                {currentExerciseName}
              </h3>
              {/* Botão de fechar modal — limpa URL e nome do exercício atual */}
              <button
                onClick={() => {
                  setShowVideoModal(false);
                  setCurrentVideoUrl(null);
                }}
                className="rounded-full p-2 text-white/60 transition hover:bg-white/5"
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
                className="h-full w-full object-contain"
              />
            </div>

            <div className="bg-white/5 p-6">
              <p className="text-center text-xs uppercase tracking-[0.2em] text-white/40">
                Demonstração de execução correta
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}