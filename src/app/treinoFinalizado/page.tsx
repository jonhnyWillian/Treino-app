"use client";

/**
 * TreinoFinalizadoPage
 *
 * Tela exibida ao concluir (ou revisar pelo histórico) um treino.
 * Possui duas abas:
 *   1. "Cards para postar"  → gera imagens visuais (PR, Desafio, Streak) que o usuário pode baixar ou compartilhar
 *   2. "Minhas Conquistas"  → lista resumida dos exercícios da sessão
 *
 * Fluxo de dados:
 *   - Os dados do treino chegam via sessionStorage ("ATIVOFinishedWorkout")
 *   - Se não houver dados, redireciona para /dashboard ou /historico
 *   - O parâmetro ?source=historico indica que veio do histórico (não da execução)
 *
 * Geração de imagem para compartilhamento:
 *   - Usamos a Canvas API nativa + SVG foreignObject para converter o card React em PNG
 *   - O PNG é compartilhado via Web Share API (mobile) ou baixado (desktop)
 *   - Cada card (PR, Desafio, Streak) é um componente separado com ref própria
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Share2,
  MessageCircle,
  Star,
  Trophy,
  Flame,
} from "lucide-react";
import toast from "react-hot-toast";

/* ─────────────────────────────────────────────
   TIPOS
───────────────────────────────────────────── */

type ExercicioResumo = {
  nome: string;
  series: number;
  repeticoes: string;
  carga: number | null;
  isPR?: boolean; // true quando o usuário bateu recorde nesse exercício
};

type FinishedWorkoutSummary = {
  nomeTreino: string;
  dataTreino: string;
  duracaoSegundos: number;
  exercicios: ExercicioResumo[];
  streakAtual?: number;      // dias seguidos treinando
  desafioConcluido?: string; // nome do desafio, se concluiu algum nessa sessão
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

/**
 * Converte segundos em string "MM:SS".
 * Usado nos cards de resumo e no card de PR.
 */
const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0){
    return "00:00";
  } 
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

/**
 * Formata uma string ISO de data para "DD/MM/AAAA".
 * Exibido no rodapé dos cards de compartilhamento.
 */
const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

/**
 * Soma as séries de todos os exercícios.
 * Usado no card de Stats e no resumo de conquistas.
 */
const calcTotalSeries = (exercicios: ExercicioResumo[]): number =>
  exercicios.reduce((acc, e) => acc + (e.series || 0), 0);

/**
 * Calcula o volume total em kg (carga × séries por exercício).
 * Retorna 0 quando não há carga registrada.
 */
const calcVolume = (exercicios: ExercicioResumo[]): number =>
  exercicios.reduce(
    (acc, e) => acc + (e.carga && e.series ? e.carga * e.series : 0),
    0
  );

/* ─────────────────────────────────────────────
   HOOK: geração de imagem via SVG foreignObject
───────────────────────────────────────────── */

/**
 * useShareCard
 *
 * Recebe uma ref para um elemento DOM e retorna:
 *   - handleDownload: converte para PNG e faz download
 *   - handleShareInstagram: tenta Web Share API (mobile) → fallback download
 *   - handleShareWhatsApp: compartilha via Web Share API genérica
 *
 * Por que SVG foreignObject ao invés de html2canvas?
 *   O Tailwind v4 gera cores no formato oklab() e lab() que o html2canvas
 *   não consegue parsear, causando erro na captura. A abordagem com
 *   SVG foreignObject delega a renderização ao próprio browser, que suporta
 *   qualquer função de cor CSS moderna nativamente.
 *
 * Como funciona a geração de imagem:
 *   1. Serializa o elemento DOM para string HTML via XMLSerializer
 *   2. Coleta todas as regras CSS da página e injeta no SVG via <style>
 *      (necessário porque o SVG é renderizado em contexto isolado)
 *   3. Embute o HTML dentro de um <foreignObject> no SVG
 *   4. Converte o SVG para Blob URL e carrega em um <img>
 *   5. Desenha o <img> em um <canvas> com escala 2× para qualidade Retina
 */
function useShareCard(ref: React.RefObject<HTMLDivElement | null>, filename: string) {

  /**
   * toCanvas
   *
   * Núcleo da geração de imagem. Converte o elemento referenciado
   * em um HTMLCanvasElement pronto para exportar como PNG.
   *
   * Retorna null se o elemento não estiver montado ou ocorrer erro.
   */
  const toCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!ref.current) return null;
    try {
      const el = ref.current;
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      const scale = 2; // escala 2× para qualidade Retina / Instagram

      // Prepara o canvas de saída com dimensões escaladas
      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);

      /**
       * Coleta todas as regras CSS das folhas de estilo da página.
       * Isso inclui as classes do Tailwind, fontes e qualquer CSS global.
       * É necessário injetar no SVG pois ele renderiza em contexto isolado
       * e não herda os estilos do documento principal.
       *
       * O try/catch interno trata folhas de estilo cross-origin (ex: Google Fonts)
       * que lançam SecurityError ao tentar acessar cssRules.
       */
      const styles = Array.from(document.styleSheets)
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules).map((r) => r.cssText);
          } catch {
            // Folha de estilo cross-origin — ignora silenciosamente
            return [];
          }
        })
        .join("\n");

      /**
       * Serializa o elemento DOM para string HTML.
       * XMLSerializer captura o estado atual do DOM incluindo
       * atributos de estilo inline e classes aplicadas.
       */
      const xml = new XMLSerializer().serializeToString(el);

      /**
       * Monta o SVG com foreignObject.
       * O foreignObject permite embutir HTML arbitrário dentro de um SVG,
       * e o browser renderiza exatamente como faria no DOM normal —
       * incluindo gradientes, sombras, fontes e cores modernas.
       */
      const svgStr = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <defs>
            <style>${styles}</style>
          </defs>
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              ${xml}
            </div>
          </foreignObject>
        </svg>`;

      // Converte a string SVG em Blob URL para usar como src de imagem
      const blob = new Blob([svgStr], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);

      /**
       * Carrega o SVG como imagem e desenha no canvas.
       * O Promise garante que aguardamos o carregamento completo
       * antes de chamar drawImage, evitando canvas em branco.
       */
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          // Preenche o fundo com a cor base do app antes de desenhar o card
          ctx.fillStyle = "#0d1117";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          // Libera o Blob URL da memória após uso
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });

      return canvas;
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      toast.error("Erro ao gerar imagem.");
      return null;
    }
  };

  /**
   * handleDownload
   *
   * Gera o PNG e dispara o download no browser via link programático.
   * Funciona em desktop e mobile.
   */
  const handleDownload = async () => {
    const canvas = await toCanvas();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Imagem salva!");
  };

  /**
   * handleShareInstagram
   *
   * Tenta compartilhar via Web Share API com arquivo (suportada em mobile/Safari).
   * Fallback: download direto para o usuário postar manualmente no Instagram.
   *
   * navigator.canShare({ files }) verifica suporte antes de chamar share(),
   * evitando erros em browsers que não suportam compartilhamento de arquivos.
   */
  const handleShareInstagram = async () => {
    const canvas = await toCanvas();
    if (!canvas) return;

    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), "image/png")
    );
    const file = new File([blob], `${filename}.png`, { type: "image/png" });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Kinetic — meu treino" });
    } else {
      // Desktop: baixa a imagem para o usuário postar manualmente
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast("Salvo! Abra o Instagram e poste a imagem.", { icon: "📸" });
    }
  };

  /**
   * handleShareWhatsApp
   *
   * Compartilha o PNG via Web Share API genérica.
   * O sistema operacional exibe o seletor de apps (WhatsApp, Telegram, etc.).
   * Fallback: instrução para usar o botão Download.
   */
  const handleShareWhatsApp = async () => {
    const canvas = await toCanvas();
    if (!canvas) return;
    const blob = await new Promise<Blob>((res) =>
      canvas.toBlob((b) => res(b!), "image/png")
    );
    const file = new File([blob], `${filename}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
    } else {
      toast("Use o botão Download e compartilhe pelo app desejado.", { icon: "💬" });
    }
  };

  return { handleDownload, handleShareInstagram, handleShareWhatsApp };
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTES: Cards visuais para postar
───────────────────────────────────────────── */

/**
 * ShareButtons
 *
 * Botões de ação abaixo de cada card (Download, Instagram, WhatsApp).
 * Extraído para evitar repetição nos 3 cards.
 */
function ShareButtons({
  onDownload,
  onInstagram,
  onWhatsApp,
}: {
  onDownload: () => void;
  onInstagram: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-2">
      {/* Download direto */}
      <button
        onClick={onDownload}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/50 ring-1 ring-white/10 transition hover:bg-white/10"
      >
        <Download size={16} />
      </button>

      {/* Instagram — preenche o espaço central */}
      <button
        onClick={onInstagram}
        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#22c55e] py-3 text-xs font-black uppercase tracking-widest text-[#052e16] transition hover:bg-[#16a34a]"
      >
        <Share2 size={14} />
        Instagram
      </button>

      {/* WhatsApp / outros apps */}
      <button
        onClick={onWhatsApp}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/50 ring-1 ring-white/10 transition hover:bg-white/10"
      >
        <MessageCircle size={16} />
      </button>
    </div>
  );
}

/* ── Card 1: Novo Recorde Pessoal ── */

/**
 * PRCard
 *
 * Exibe o exercício em que o usuário bateu PR nessa sessão.
 * A prop `cardRef` é passada para o hook useShareCard capturar o DOM.
 *
 * Layout: fundo escuro com gradiente verde na base, badge de recorde,
 * carga em destaque em verde e stats menores (séries, reps, evolução).
 *
 * Nota: overflow é controlado via style inline (não className) para garantir
 * que o SVG foreignObject capture corretamente os limites do card.
 */
function PRCard({
  cardRef,
  exercicio,
  data,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  exercicio: ExercicioResumo;
  data: FinishedWorkoutSummary;
}) {
  // Carga anterior simulada — idealmente viria do backend como histórico real
  const cargaAnterior = exercicio.carga ? exercicio.carga - 5 : null;

  return (
    <div
      ref={cardRef}
      className="relative rounded-2xl bg-[#111827]"
      style={{ minHeight: 260, borderRadius: 16, overflow: "hidden" }}
    >
      {/* Fundo escuro com gradiente verde na base — identidade Kinetic */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d1a0d] via-[#111827]/80 to-[#111827]" />
      {/* Linha de luz verde no chão, efeito cinematográfico */}
      <div
        className="absolute bottom-0 left-1/4 right-1/4 h-0.5"
        style={{
          background: "#22c55e",
          boxShadow: "0 0 24px 8px rgba(34,197,94,0.45)",
        }}
      />
      {/* Névoa verde subindo do chão */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[rgba(34,197,94,0.08)] to-transparent" />

      <div className="relative z-10 p-5">
        {/* Badge de recorde pessoal */}
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/20 px-3 py-1 ring-1 ring-[#22c55e]/40">
          <Star size={10} fill="#22c55e" className="text-[#22c55e]" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#22c55e]">
            Novo Recorde Pessoal
          </span>
        </div>

        {/* Nome do exercício */}
        <h2 className="text-xl font-black leading-tight text-white">
          {exercicio.nome}
        </h2>

        {/* Carga em destaque — número grande em verde */}
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-6xl font-black leading-none text-[#22c55e]">
            {exercicio.carga ?? "--"}
          </span>
          <span className="text-xl font-bold text-white/50">kg</span>
        </div>

        {/* Stats secundários: séries, reps e evolução de carga */}
        <div className="mt-4 flex gap-6">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">
              Séries
            </div>
            <div className="text-base font-black text-white">{exercicio.series}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">
              Reps
            </div>
            <div className="text-base font-black text-white">{exercicio.repeticoes}</div>
          </div>
          {/* Evolução só aparece quando há carga anterior para comparar */}
          {cargaAnterior && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">
                Evolução
              </div>
              <div className="text-base font-black text-[#22c55e]">
                +{exercicio.carga! - cargaAnterior}kg
              </div>
            </div>
          )}
        </div>

        {/* Rodapé: marca do app + data do treino */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] font-bold italic text-[#22c55e]/70">KINETIC</span>
          <span className="text-[9px] text-white/25">{formatDate(data.dataTreino)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Card 2: Desafio Concluído ── */

/**
 * DesafioCard
 *
 * Exibido quando `data.desafioConcluido` está preenchido.
 * Mostra o nome do desafio, XP ganho e uma mensagem motivacional.
 * Layout centralizado com ícone de troféu em destaque.
 */
function DesafioCard({
  cardRef,
  data,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  data: FinishedWorkoutSummary;
}) {
  return (
    <div
      ref={cardRef}
      className="relative rounded-2xl bg-[#111827] text-center"
      style={{ minHeight: 260, borderRadius: 16, overflow: "hidden" }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d1a0d] via-[#111827]/80 to-[#111827]" />
      <div
        className="absolute bottom-0 left-1/4 right-1/4 h-0.5"
        style={{ background: "#22c55e", boxShadow: "0 0 24px 8px rgba(34,197,94,0.4)" }}
      />
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[rgba(34,197,94,0.06)] to-transparent" />

      <div className="relative z-10 p-6">
        {/* Ícone de troféu com halo brilhante */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#22c55e] shadow-[0_0_32px_rgba(34,197,94,0.6)]">
          <Trophy size={28} className="text-[#052e16]" />
        </div>

        {/* Label da conquista */}
        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#22c55e]">
          Desafio Concluído
        </div>

        {/* Nome do desafio concluído */}
        <h2 className="text-2xl font-black leading-tight text-white">
          {data.desafioConcluido}
        </h2>

        {/* Mensagem motivacional fixa */}
        <p className="mt-2 text-xs text-white/45 leading-relaxed">
          Você completou este desafio com consistência e determinação.
        </p>

        {/* Badge de XP ganho */}
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/10 px-4 py-1.5 ring-1 ring-[#22c55e]/25">
          <span className="text-sm font-black text-[#22c55e]">+500 XP REWARD</span>
        </div>

        {/* Rodapé: marca do app + data do treino */}
        <div className="mt-5 flex items-center justify-between">
          <span className="text-[10px] font-bold italic text-[#22c55e]/70">KINETIC</span>
          <span className="text-[9px] text-white/25">{formatDate(data.dataTreino)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Card 3: Active Streak ── */

/**
 * StreakCard
 *
 * Exibe o streak atual de dias seguidos treinando.
 * Visual "raw": número grande, barra de progresso para próxima conquista
 * e dot indicador no final da barra.
 *
 * O progresso é calculado em ciclos de 7 dias (streak % 7),
 * onde cada ciclo completo representa uma semana consecutiva de treino.
 */
function StreakCard({
  cardRef,
  data,
}: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  data: FinishedWorkoutSummary;
}) {
  const streak = data.streakAtual ?? 0;
  // Progresso para a próxima conquista semanal (0–100%)
  const progressoPct = Math.min((streak % 7) / 7, 1) * 100;

  return (
    <div
      ref={cardRef}
      className="relative rounded-2xl bg-[#111827]"
      style={{ minHeight: 220, borderRadius: 16, overflow: "hidden" }}
    >
      {/* Fundo com gradiente escuro do topo ao fundo */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117] to-[#0a1a0a]" />
      {/* Linha verde brilhante na base do card */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: "#22c55e", boxShadow: "0 0 16px 4px rgba(34,197,94,0.5)" }}
      />

      <div className="relative z-10 p-5">
        {/* Label com ícone de chama */}
        <div className="mb-3 flex items-center gap-2">
          <Flame size={14} className="text-[#22c55e]" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#22c55e]">
            Active Streak
          </span>
        </div>

        {/* Número de dias em destaque */}
        <div className="flex items-baseline gap-2">
          <span className="text-7xl font-black leading-none text-white">{streak}</span>
          <span className="text-2xl font-bold text-white/50">DIAS</span>
        </div>

        <div className="mt-0.5 text-xs font-bold uppercase tracking-widest text-white/30">
          Seguidos no Foco
        </div>

        {/* Barra de progresso para próxima conquista semanal */}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-[#22c55e] transition-all duration-700"
            style={{
              width: `${progressoPct}%`,
              boxShadow: "0 0 8px rgba(34,197,94,0.6)",
            }}
          />
        </div>
        {/* Dot brilhante no final da barra — indica posição atual no ciclo */}
        <div className="relative -mt-3 flex justify-end pr-1">
          <div className="h-3 w-3 rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
        </div>

        {/* Rodapé: marca do app + data do treino */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[10px] font-bold italic text-[#22c55e]/70">KINETIC</span>
          <span className="text-[9px] text-white/25">{formatDate(data.dataTreino)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────────── */

export default function TreinoFinalizadoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * "source" define de onde o usuário veio:
   *   - "execucao" → veio direto de terminar o treino → voltar para /dashboard
   *   - "historico" → veio do histórico para revisar → voltar para /historico
   */
  const source = searchParams.get("source") ?? "execucao";
  const isFromHistory = source === "historico";

  const [data, setData] = useState<FinishedWorkoutSummary | null>(null);

  /**
   * Lê os dados do sessionStorage ao montar.
   * sessionStorage é usado (não localStorage) porque esses dados
   * são temporários — válidos apenas para a sessão atual da aba.
   * Se não existirem dados ou forem inválidos, redireciona o usuário.
   */
  useEffect(() => {
    const raw = sessionStorage.getItem("ATIVOFinishedWorkout");
    if (!raw) {
      router.replace(isFromHistory ? "/historico" : "/dashboard");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as FinishedWorkoutSummary;
      if (!parsed?.nomeTreino || !Array.isArray(parsed.exercicios)) {
        throw new Error("Dados inválidos");
      }
      setData(parsed);
    } catch {
      router.replace(isFromHistory ? "/historico" : "/dashboard");
    }
  }, [isFromHistory, router]);

  // Métricas derivadas — recalculadas apenas quando `data` muda
  const totalSeries = useMemo(
    () => calcTotalSeries(data?.exercicios ?? []),
    [data]
  );
  const totalVolume = useMemo(
    () => calcVolume(data?.exercicios ?? []),
    [data]
  );

  /**
   * Encontra o primeiro exercício marcado como PR nessa sessão.
   * Usado para preencher o PRCard. Retorna undefined se não houver PR.
   */
  const prExercicio = useMemo(
    () => data?.exercicios.find((e) => e.isPR),
    [data]
  );

  // Refs para cada card — usadas pelo hook useShareCard para capturar o DOM
  const prRef = useRef<HTMLDivElement>(null);
  const desafioRef = useRef<HTMLDivElement>(null);
  const streakRef = useRef<HTMLDivElement>(null);

  // Instâncias do hook de compartilhamento — uma por card
  const prShare = useShareCard(prRef, "kinetic-pr");
  const desafioShare = useShareCard(desafioRef, "kinetic-desafio");
  const streakShare = useShareCard(streakRef, "kinetic-streak");

  // Aba ativa: "cards" (compartilhamento) | "conquistas" (resumo da sessão)
  const [aba, setAba] = useState<"cards" | "conquistas">("cards");

  /**
   * Navega de volta para a origem correta dependendo de onde o usuário veio.
   */
  const handleClose = () =>
    router.push(isFromHistory ? "/historico" : "/dashboard");

  // Exibe loading enquanto lê e valida o sessionStorage
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1117]">
        <div className="text-sm text-white/40">Carregando resumo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <button
          onClick={handleClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/60 ring-1 ring-white/10 transition hover:bg-white/10"
          aria-label="Voltar"
        >
          <ArrowLeft size={17} />
        </button>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-[#22c55e]">
          Performance
        </span>
        {/* Espaçador para centralizar o título */}
        <div className="h-9 w-9" />
      </div>

      {/* ── Seletor de abas ── */}
      <div className="mx-5 mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/5">
        {(["cards", "conquistas"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setAba(tab)}
            className={`rounded-xl py-2.5 text-xs font-black uppercase tracking-widest transition ${
              aba === tab
                ? "bg-white/10 text-white"
                : "text-white/35 hover:text-white/60"
            }`}
          >
            {tab === "cards" ? "Cards para postar" : "Minhas Conquistas"}
          </button>
        ))}
      </div>

      <div className="space-y-5 px-5 pb-32">
        {/* ════════════════════════════
            ABA 1 — Cards para postar
        ════════════════════════════ */}
        {aba === "cards" && (
          <>
            {/* Card PR — só renderiza se houver exercício com isPR:true */}
            {prExercicio ? (
              <div>
                <PRCard cardRef={prRef} exercicio={prExercicio} data={data} />
                <ShareButtons
                  onDownload={prShare.handleDownload}
                  onInstagram={prShare.handleShareInstagram}
                  onWhatsApp={prShare.handleShareWhatsApp}
                />
              </div>
            ) : null}

            {/* Card Desafio — só renderiza se houver desafio concluído */}
            {data.desafioConcluido ? (
              <div>
                <DesafioCard cardRef={desafioRef} data={data} />
                <ShareButtons
                  onDownload={desafioShare.handleDownload}
                  onInstagram={desafioShare.handleShareInstagram}
                  onWhatsApp={desafioShare.handleShareWhatsApp}
                />
              </div>
            ) : null}

            {/* Card Streak — sempre renderiza, independente de PR ou desafio */}
            <div>
              <StreakCard cardRef={streakRef} data={data} />
              <ShareButtons
                onDownload={streakShare.handleDownload}
                onInstagram={streakShare.handleShareInstagram}
                onWhatsApp={streakShare.handleShareWhatsApp}
              />
            </div>

            {/* Mensagem de incentivo quando não há PR nem desafio */}
            {!prExercicio && !data.desafioConcluido && (
              <p className="text-center text-xs text-white/25">
                Complete desafios ou bata recordes para desbloquear mais cards!
              </p>
            )}
          </>
        )}

        {/* ════════════════════════════
            ABA 2 — Minhas Conquistas
        ════════════════════════════ */}
        {aba === "conquistas" && (
          <>
            {/* Grade de métricas da sessão: duração, exercícios, séries, volume */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Duração", value: formatDuration(data.duracaoSegundos) },
                { label: "Exercícios", value: String(data.exercicios.length) },
                { label: "Séries", value: String(totalSeries) },
                {
                  label: "Volume",
                  value: totalVolume > 0 ? `${totalVolume.toFixed(1)} kg` : "--",
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-2xl bg-[#111827] p-4 ring-1 ring-white/5"
                >
                  <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-white/30">
                    {label}
                  </div>
                  <div className="text-2xl font-black text-white">{value}</div>
                </div>
              ))}
            </div>

            {/* Lista detalhada de exercícios realizados na sessão */}
            <div>
              <div className="mb-3 text-[9px] font-bold uppercase tracking-widest text-white/30">
                Resumo da sessão
              </div>
              <div className="space-y-2">
                {data.exercicios.map((item) => (
                  <div
                    key={item.nome}
                    className="flex items-center justify-between rounded-2xl bg-[#111827] px-4 py-3 ring-1 ring-white/5"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-white/90">
                        {item.nome}
                        {/* Badge PR — aparece se o exercício bateu recorde */}
                        {item.isPR && (
                          <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-black text-amber-400">
                            PR
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-white/40">
                        {item.series} séries · {item.repeticoes} reps ·{" "}
                        {item.carga ? `${item.carga}kg` : "--"}
                      </div>
                    </div>
                    {/* Volume por exercício (carga × séries) — só exibe se houver carga */}
                    {item.carga && (
                      <div className="text-xs font-bold text-[#22c55e]/70">
                        {(item.carga * item.series).toFixed(0)}kg
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Botões de ação: fechar/continuar ou ir para aba de compartilhamento */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleClose}
                className="rounded-2xl border border-white/10 bg-transparent py-4 text-xs font-black uppercase tracking-widest text-white/70 transition hover:bg-white/5"
              >
                {isFromHistory ? "Fechar" : "Continuar"}
              </button>
              <button
                onClick={() => setAba("cards")}
                className="flex items-center justify-center gap-2 rounded-2xl bg-[#22c55e] py-4 text-xs font-black uppercase tracking-widest text-[#052e16] shadow-[0_8px_24px_rgba(34,197,94,0.3)] transition hover:bg-[#16a34a]"
              >
                <Share2 size={14} />
                Compartilhar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}