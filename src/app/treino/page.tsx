"use client";

import Image from "next/image";
import { treinos, TipoTreino } from "@/data/treinos";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronUp, Play, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { getPerfil } from "@/services/api";

/**
 * Mapa de imagens por exercício.
 * Associa o nome normalizado do exercício ao caminho da imagem correspondente.
 * Usado para exibir a foto do exercício na lista de rotina sugerida.
 */
const exerciseImageMap: Record<string, string> = {
  "agachamento livre": "/imagens/exercicios/exerciciosInferior/agachamentoLivre.png",
  "hack": "/imagens/exercicios/exerciciosInferior/hack.png",
  "leg press": "/imagens/exercicios/exerciciosInferior/legpress.png",
  "cadeira extensora": "/imagens/exercicios/exerciciosInferior/cadeiraExtensora.png",
  "afundo": "/imagens/exercicios/exerciciosInferior/afundo.png",
  "mesa flexora": "/imagens/exercicios/exerciciosInferior/mesaflexora.png",
  "stiff": "/imagens/exercicios/exerciciosInferior/stiff.png",
  "levantamento terra": "/imagens/exercicios/exerciciosInferior/levantamentoterra.png",
  "elevacao pelvica": "/imagens/exercicios/exerciciosInferior/elevacaopelvica.png",
  "abducao no cabo": "/imagens/exercicios/exerciciosInferior/abducaoCabo.png",
  "coice no cabo": "/imagens/exercicios/exerciciosInferior/coiceCabo.png",
  "panturrilha em pe": "/imagens/exercicios/exerciciosInferior/panturrilhaemPe.png",
  "panturrilha sentado": "/imagens/exercicios/exerciciosInferior/panturrilhaSentado.png",
  "supino reto": "/imagens/exercicios/exericiosSuperior/supinoReto.png",
  "supino inclinado": "/imagens/exercicios/exericiosSuperior/supinoInclinado.png",
  "voador": "/imagens/exercicios/exericiosSuperior/voador.png",
  "crucifixo": "/imagens/exercicios/exericiosSuperior/crucifixo.png",
  "puxada frente": "/imagens/exercicios/exericiosSuperior/puxadaFrente.png",
  "remada curvada": "/imagens/exercicios/exericiosSuperior/remadaCurvada.png",
  "remada baixa": "/imagens/exercicios/exericiosSuperior/remadaBaixa.png",
  "desenvolvimento": "/imagens/exercicios/exericiosSuperior/desenvolvimentoOmbro.png",
  "elevacao lateral": "/imagens/exercicios/exericiosSuperior/elevacaoLateral.png",
  "elevacao frontal": "/imagens/exercicios/exericiosSuperior/elevacaoFrontal.png",
  "rosca direta": "/imagens/exercicios/exericiosSuperior/roscaDireta.png",
  "rosca alternada": "/imagens/exercicios/exericiosSuperior/roscaAlternada.png",
  "rosca martelo": "/imagens/exercicios/exericiosSuperior/roscaMartelo.png",
  "triceps corda": "/imagens/exercicios/exericiosSuperior/tricepsCorda.png",
  //"triceps testa": "/imagens/exercicios/exericiosSuperior/tricepsTesta.png",
  "mergulho": "/imagens/exercicios/exericiosSuperior/mergulhoTriceps.png",
  "triceps frances":"/imagens/exercicios/exericiosSuperior/tricepsFrances.png",
  "triceps unilateral": "/imagens/exercicios/exericiosSuperior/tricepsUnilateral.png",
  "crossover polia alta": "/imagens/exercicios/exericiosSuperior/crossOverAlta.png",
  "crossover polia baixa" : "/imagens/exercicios/exericiosSuperior/crossOverBaixa.png",
};

/**
 * Normaliza o nome do exercício para busca no mapa de imagens.
 * Remove acentos, converte para minúsculas e elimina espaços extras.
 * Necessário porque os nomes podem vir com acentos ou capitalização variada.
 */
const normalizeExerciseName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export default function TreinoPage() {
  const router = useRouter();

  // Estado do gênero do usuário — usado para exibir a foto de perfil correta (masculino/feminino)
  const [userGender, setUserGender] = useState<string | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  /**
   * Lê o gênero do usuário salvo no localStorage após o mount do componente.
   * O setTimeout evita erros de "cascading renders" no React 19 durante a hidratação.
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
    }, 0);

    return () => clearTimeout(timeout);
  }, []);

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
   * Gera os próximos 5 dias a partir de hoje para o seletor de dias.
   * Usa useMemo para evitar recálculo desnecessário a cada render.
   * Retorna array com: abreviação do dia, número do dia e data completa.
   */
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

  // Estado do dia selecionado — inicializa com o dia atual (primeiro da lista)
  const [selectedDia, setSelectedDia] = useState(generatedDays[0].key);

  // Estado do tipo de treino selecionado (inferior ou superior)
  const [selectedTipo, setSelectedTipo] = useState<TipoTreino | null>(null);

  // Estado dos grupos musculares selecionados (ex: quadríceps, glúteo)
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([]);

  /**
   * Configuração dos cards de divisão de treino exibidos na tela.
   * Cada card representa um tipo de treino com título, subtítulo, ícone e imagem de capa.
   * Usamos useMemo pois esse array é estático e não precisa ser recriado a cada render.
   */
  const treinosCards: Array<{
    tipo: TipoTreino;
    title: string;
    subtitle: string;
    foco: string;
    icon: "down" | "up";
    coverImage: string;
  }> = useMemo(
    () => [
      {
        tipo: "inferior",
        title: "Inferior",
        subtitle: "DIA DE PERNA",
        foco: "FOCO",
        icon: "down",
        coverImage: "/imagens/exercicios/capadoExercicios/capa-inferior.png",
      },
      {
        tipo: "superior",
        title: "Superior",
        subtitle: "CORPO SUPERIOR",
        foco: "FOCO",
        icon: "up",
        coverImage: "/imagens/exercicios/capadoExercicios/capa-superior.png",
      },
    ],
    [],
  );

  /**
   * Calcula os grupos musculares disponíveis com base no tipo de treino selecionado.
   * Retorna as chaves do objeto de treino (ex: ["quadriceps", "posterior", "gluteo"]).
   * Recalcula sempre que o tipo de treino muda.
   */
  const gruposDisponiveis = useMemo(
    () => (selectedTipo ? Object.keys(treinos[selectedTipo]) : []),
    [selectedTipo],
  );

  /**
   * Alterna a seleção de um grupo muscular.
   * Se o grupo já está selecionado, remove-o. Caso contrário, adiciona.
   * Permite selecionar múltiplos grupos ao mesmo tempo.
   */
  const toggleGrupo = (g: string) => {
    setSelectedGrupos((prev) => {
      if (prev.includes(g)) return prev.filter((x) => x !== g);
      return [...prev, g];
    });
  };

  /**
   * Gera a lista de exercícios sugeridos com base nos grupos musculares selecionados.
   * Combina exercícios de todos os grupos escolhidos e remove duplicatas com Set.
   * Recalcula sempre que os grupos ou o tipo de treino mudam.
   */
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

  /**
   * Retorna metadados de séries e repetições para cada exercício da lista sugerida.
   * Usa o índice para variar as configurações de forma cíclica entre 4 padrões.
   * O sufixo "PASSOS" é usado para exercícios como afundo (Steps).
   */
  const getMeta = (idx: number) => {
    const sets = [4, 3, 3, 4][idx % 4];
    const reps = ["10-12", "15", "12", "20"][idx % 4];
    const suffix = idx % 4 === 3 ? "PASSOS" : "REPS";
    return { sets, reps, suffix };
  };

  /**
   * Formata o nome do grupo muscular para exibição na interface.
   * Converte a chave interna (ex: "quadriceps") para o label visível ao usuário.
   */
  const formatGrupoLabel = (g: string) => {
    switch (g) {
      case "quadriceps":
        return "Quadríceps";
      case "posterior":
        return "Posterior";
      case "gluteo":
        return "Glúteo";
      case "panturrilha":
        return "Panturrilha";
      default:
        return g;
    }
  };

  /**
   * Inicia o treino salvando a configuração no sessionStorage e navegando para a tela de execução.
   * Valida se o usuário selecionou tipo de treino e pelo menos um grupo muscular antes de prosseguir.
   * Usa sessionStorage (não localStorage) pois a configuração é temporária — apenas para a sessão atual.
   */
  const handleStartTraining = () => {
    if (!selectedTipo || selectedGrupos.length === 0) {
      toast.error("Selecione um tipo de treino e as áreas-alvo!");
      return;
    }
    sessionStorage.setItem(
      "ATIVOTrainingConfig",
      JSON.stringify({
        tipo: selectedTipo,
        diaSemana: selectedDia,
        grupos: selectedGrupos,
      }),
    );
    router.push("/treinoExecucao");
  };

  /**
   * Retorna o caminho da imagem do exercício com base no nome normalizado.
   * Normaliza o nome antes de buscar no mapa para lidar com acentos e capitalização.
   * Retorna imagem padrão ("/login-bg.jpg") se não encontrar correspondência.
   */
  const getExerciseImage = (exerciseName: string) => {
    const normalizedName = normalizeExerciseName(exerciseName);
    return exerciseImageMap[normalizedName] ?? "/login-bg.jpg";
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-4 sm:px-5 sm:pt-6">
      {/* CRIAR/SELECIONAR TREINO */}
      <>
        {/* Barra Superior — exibe foto de perfil e título da tela */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden rounded-full ring-1 ring-white/20">
              <Image
                src={profilePhoto || getProfileImage()}
                alt="Foto de perfil"
                fill
                sizes="40px"
                className="object-cover opacity-90"
                priority
              />
            </div>
            <div className="truncate text-2xl font-bold italic leading-none text-emerald-400 sm:text-[34px]">
              TREINO
            </div>
          </div>
        </div>

        {/* Seletor de dias — exibe os próximos 5 dias e destaca o selecionado */}
        <div className="mt-8 flex flex-wrap items-end justify-between gap-2">
          <div className="text-xl font-semibold uppercase text-white/90 sm:text-2xl">Plano semanal</div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">Plano semanal</div>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {generatedDays.map((d) => {
            const ATIVO = selectedDia === d.key;
            return (
              <button
                key={d.fullDate}
                type="button"
                onClick={() => setSelectedDia(d.key)}
                className={[
                  "flex flex-1 flex-col items-center justify-center rounded-2xl px-1 py-3",
                  "bg-[#121c33] ring-1 ring-white/10 transition",
                  ATIVO
                    ? "bg-gradient-to-b from-[#3f5fff] to-[#2f4df5] ring-0 shadow-[0_10px_22px_rgba(47,77,245,0.45)]"
                    : "hover:bg-[#18243e]",
                ].join(" ")}
              >
                <span
                  className={[
                    "text-[10px] font-semibold tracking-[0.14em] uppercase",
                    ATIVO ? "text-white/80" : "text-white/45",
                  ].join(" ")}
                >
                  {d.label}
                </span>
                <span
                  className={[
                    "mt-1 text-3xl font-semibold leading-none",
                    ATIVO ? "text-white" : "text-white/80",
                  ].join(" ")}
                >
                  {d.num}
                </span>
              </button>
            );
          })}
        </div>

        {/* Cards de divisão de treino — Inferior e Superior */}
        <div className="mt-10 flex items-end justify-between">
          <h2 className="text-2xl font-semibold uppercase tracking-tight sm:text-3xl">Divisão de treino</h2>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {treinosCards.map((c) => {
            const ATIVO = selectedTipo === c.tipo;
            const Icon = c.icon === "down" ? ChevronDown : ChevronUp;
            return (
              <button
                key={c.tipo}
                type="button"
                onClick={() => setSelectedTipo(c.tipo)}
                className={[
                  "group relative min-h-[190px] overflow-hidden rounded-3xl p-4 text-left transition",
                  "bg-[#111b33] ring-1 ring-white/10",
                  ATIVO
                    ? "shadow-[0_0_0_2px_rgba(59,130,246,0.92),0_0_25px_rgba(59,130,246,0.3)]"
                    : "hover:bg-[#162544]",
                ].join(" ")}
              >
                <div className="absolute inset-0">
                  <Image
                    src={c.coverImage}
                    alt={c.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover opacity-45 transition group-hover:opacity-55"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/20" />
                </div>

                <div className="relative flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                    <Icon size={18} className="text-white/80" />
                  </div>

                  <span
                    className={["flex h-7 w-7 items-center justify-center rounded-full ring-1", ATIVO ? "bg-blue-500 ring-blue-300/40" : "bg-black/35 ring-white/20"].join(" ")}
                    aria-hidden
                  >
                    {ATIVO ? <Check size={14} className="text-white" /> : null}
                  </span>
                </div>

                <div className="relative mt-16">
                  {ATIVO ? (
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                      ATIVO
                    </div>
                  ) : null}
                  <div className="text-3xl font-semibold leading-none sm:text-4xl">{c.title}</div>
                  <div className="mt-2 text-[11px] tracking-[0.18em] text-white/70">
                    {c.subtitle}
                  </div>
                  {c.foco ? (
                    <div className="mt-1 text-[11px] tracking-[0.18em] text-white/60">
                      {c.foco}
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {/* Filtros de grupos musculares — aparecem após selecionar o tipo de treino */}
        <div className="mt-6 flex flex-wrap gap-3">
          {gruposDisponiveis.map((g) => {
            const ATIVO = selectedGrupos.includes(g);
            return (
              <button
                key={g}
                type="button"
                onClick={() => toggleGrupo(g)}
                className={[
                  "flex items-center gap-2 rounded-full px-4 py-2 text-left transition",
                  "bg-[#151f35] ring-1 ring-white/10",
                  ATIVO
                    ? "shadow-[0_0_0_1px_rgba(74,222,128,0.45),0_0_16px_rgba(74,222,128,0.2)]"
                    : "hover:bg-[#1a2946]",
                ].join(" ")}
              >
                <span className={["h-2.5 w-2.5 rounded-full", ATIVO ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" : "bg-white/25"].join(" ")} />
                <span className="text-sm font-medium uppercase tracking-wide">
                  {formatGrupoLabel(g)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Lista de exercícios sugeridos — baseada nos grupos musculares selecionados */}
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
                    sizes="64px"
                    className="object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/30" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xl font-semibold leading-none sm:text-2xl">{name}</div>
                  <div className="mt-2 flex items-center gap-2 text-[12px] text-white/60">
                    <span className="rounded-lg bg-white/10 px-2 py-1">{meta.sets} Séries</span>
                    <span>
                      {meta.reps} {meta.suffix === "REPS" ? "Repetições" : "Passos"}
                    </span>
                  </div>
                </div>             
              </div>
            );
          })}
        </div>
      </>

      {/* Botão flutuante para iniciar o treino — fixo no canto inferior direito */}
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