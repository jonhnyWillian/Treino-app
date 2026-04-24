"use client";

/**
 * TreinoFinalizadoPage
 *
 * Tela exibida ao concluir (ou revisar pelo histórico) um treino.
 * Possui duas abas:
 *   1. "Cards para postar"  → gera imagens visuais (PR, Desafio, Streak)
 *   2. "Minhas Conquistas"  → lista resumida dos exercícios da sessão
 *
 * Geração de imagem:
 *   - PRCard e DesafioCard: dom-to-image-more (captura DOM)
 *   - StreakCard: Canvas 2D API via drawStreakCard() — sem captura DOM,
 *     100% compatível com Tailwind v4 (oklab/lab não causa erros)
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Share2, MessageCircle, Star, Trophy } from "lucide-react";
import toast from "react-hot-toast";

import StreakCard from "./streakcard"
import { drawStreakCard } from "./drawstreakcard" 

/* ─────────────────────────────────────────────
   TIPOS
───────────────────────────────────────────── */

type ExercicioResumo = {
  nome: string;
  series: number;
  repeticoes: string;
  carga: number | null;
  isPR?: boolean;
};

type FinishedWorkoutSummary = {
  nomeTreino: string;
  dataTreino: string;
  duracaoSegundos: number;
  exercicios: ExercicioResumo[];
  streakAtual?: number;
  melhorStreak?: number;
  totalDiasTreinados?: number;
  desafioConcluido?: string;
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const calcTotalSeries = (exercicios: ExercicioResumo[]): number =>
  exercicios.reduce((acc, e) => acc + (e.series || 0), 0);

const calcVolume = (exercicios: ExercicioResumo[]): number =>
  exercicios.reduce(
    (acc, e) => acc + (e.carga && e.series ? e.carga * e.series : 0),
    0
  );

/* ─────────────────────────────────────────────
   HOOK: captura DOM via dom-to-image-more
   Usado apenas para PRCard e DesafioCard.
───────────────────────────────────────────── */

/**
 * useShareCard
 *
 * Captura um elemento DOM e converte para PNG via dom-to-image-more.
 * Usado para PRCard e DesafioCard (que têm layout mais simples).
 * O StreakCard usa drawStreakCard() (Canvas 2D) em vez deste hook.
 */
function useShareCard(ref: React.RefObject<HTMLDivElement | null>, filename: string) {
  const toCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!ref.current) return null;
    try {
      const domtoimage = (await import("dom-to-image-more")).default;
      const scale = 2;
      const width = ref.current.offsetWidth;
      const height = ref.current.offsetHeight;

      const dataUrl = await domtoimage.toPng(ref.current, {
        width: width * scale,
        height: height * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: `${width}px`,
          height: `${height}px`,
        },
      });

      const canvas = document.createElement("canvas");
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext("2d")!;

      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => { ctx.drawImage(img, 0, 0); resolve(); };
        img.onerror = reject;
        img.src = dataUrl;
      });

      return canvas;
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      toast.error("Erro ao gerar imagem.");
      return null;
    }
  };

  const handleDownload = async () => {
    const canvas = await toCanvas();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Imagem salva!");
  };

  const handleShareInstagram = async () => {
    const canvas = await toCanvas();
    if (!canvas) return;
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
    const file = new File([blob], `${filename}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Treinos — meu treino" });
    } else {
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast("Salvo! Abra o Instagram e poste a imagem.", { icon: "📸" });
    }
  };

  const handleShareWhatsApp = async () => {
    const canvas = await toCanvas();
    if (!canvas) return;
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
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
   HOOK: geração de imagem do Streak via Canvas 2D
   Não captura DOM — desenha o card programaticamente.
───────────────────────────────────────────── */

/**
 * useStreakShare
 *
 * Usa drawStreakCard() para gerar a imagem do streak via Canvas 2D API.
 * Completamente independente do DOM — não sofre com problemas de CSS moderno.
 */
function useStreakShare(
  data: FinishedWorkoutSummary | null,
  filename: string
) {
  /**
   * Cria um canvas offscreen, desenha o card e retorna o canvas pronto.
   */
  const toCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!data) return null;
    const canvas = document.createElement("canvas");
    drawStreakCard(canvas, {
      streakAtual:        data.streakAtual        ?? 0,
      melhorStreak:       data.melhorStreak        ?? 0,
      totalDiasTreinados: data.totalDiasTreinados  ?? 0,
      dataTreino:         data.dataTreino,
    });
    return canvas;
  }, [data]);

  const handleDownload = useCallback(() => {
    const canvas = toCanvas();
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Imagem salva!");
  }, [toCanvas, filename]);

  const handleShareInstagram = useCallback(async () => {
    const canvas = toCanvas();
    if (!canvas) return;
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
    const file = new File([blob], `${filename}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Treinos — meu treino" });
    } else {
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast("Salvo! Abra o Instagram e poste a imagem.", { icon: "📸" });
    }
  }, [toCanvas, filename]);

  const handleShareWhatsApp = useCallback(async () => {
    const canvas = toCanvas();
    if (!canvas) return;
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
    const file = new File([blob], `${filename}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
    } else {
      toast("Use o botão Download e compartilhe pelo app desejado.", { icon: "💬" });
    }
  }, [toCanvas, filename]);

  return { handleDownload, handleShareInstagram, handleShareWhatsApp };
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTES
───────────────────────────────────────────── */

/**
 * ShareButtons — botões Download / Instagram / WhatsApp.
 * Usado pelos cards PRCard e DesafioCard.
 * O StreakCard tem seus próprios botões integrados.
 */
function ShareButtons({ onDownload, onInstagram, onWhatsApp }: {
  onDownload: () => void;
  onInstagram: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-2">
      <button onClick={onDownload} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-white/50 ring-1 ring-white/10 transition hover:bg-white/10">
        <Download size={16} />
      </button>
      <button onClick={onInstagram} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#22c55e] text-xs font-black uppercase tracking-widest text-[#052e16] transition hover:bg-[#16a34a]">
        <Share2 size={14} /> Instagram
      </button>
      <button onClick={onWhatsApp} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-white/50 ring-1 ring-white/10 transition hover:bg-white/10">
        <MessageCircle size={16} />
      </button>
    </div>
  );
}

/** PRCard — card de novo recorde pessoal */
function PRCard({ cardRef, exercicio, data }: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  exercicio: ExercicioResumo;
  data: FinishedWorkoutSummary;
}) {
  const cargaAnterior = exercicio.carga ? exercicio.carga - 5 : null;
  return (
    <div ref={cardRef} className="relative rounded-2xl bg-[#111827]" style={{ minHeight: 260, borderRadius: 16, overflow: "hidden" }}>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d1a0d] via-[#111827]/80 to-[#111827]" />
      <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5" style={{ background: "#22c55e", boxShadow: "0 0 24px 8px rgba(34,197,94,0.45)" }} />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[rgba(34,197,94,0.08)] to-transparent" />
      <div className="relative z-10 p-5">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/20 px-3 py-1 ring-1 ring-[#22c55e]/40">
          <Star size={10} fill="#22c55e" className="text-[#22c55e]" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#22c55e]">Novo Recorde Pessoal</span>
        </div>
        <h2 className="text-xl font-black leading-tight text-white">{exercicio.nome}</h2>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-6xl font-black leading-none text-[#22c55e]">{exercicio.carga ?? "--"}</span>
          <span className="text-xl font-bold text-white/50">kg</span>
        </div>
        <div className="mt-4 flex gap-6">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">Séries</div>
            <div className="text-base font-black text-white">{exercicio.series}</div>
          </div>
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">Reps</div>
            <div className="text-base font-black text-white">{exercicio.repeticoes}</div>
          </div>
          {cargaAnterior && (
            <div>
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/30">Evolução</div>
              <div className="text-base font-black text-[#22c55e]">+{exercicio.carga! - cargaAnterior}kg</div>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] font-bold italic text-[#22c55e]/70">KINETIC</span>
          <span className="text-[9px] text-white/25">{formatDate(data.dataTreino)}</span>
        </div>
      </div>
    </div>
  );
}

/** DesafioCard — card de desafio concluído */
function DesafioCard({ cardRef, data }: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  data: FinishedWorkoutSummary;
}) {
  return (
    <div ref={cardRef} className="relative rounded-2xl bg-[#111827] text-center" style={{ minHeight: 260, borderRadius: 16, overflow: "hidden" }}>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d1a0d] via-[#111827]/80 to-[#111827]" />
      <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5" style={{ background: "#22c55e", boxShadow: "0 0 24px 8px rgba(34,197,94,0.4)" }} />
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[rgba(34,197,94,0.06)] to-transparent" />
      <div className="relative z-10 p-6">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#22c55e] shadow-[0_0_32px_rgba(34,197,94,0.6)]">
          <Trophy size={28} className="text-[#052e16]" />
        </div>
        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#22c55e]">Desafio Concluído</div>
        <h2 className="text-2xl font-black leading-tight text-white">{data.desafioConcluido}</h2>
        <p className="mt-2 text-xs leading-relaxed text-white/45">Você completou este desafio com consistência e determinação.</p>
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#22c55e]/10 px-4 py-1.5 ring-1 ring-[#22c55e]/25">
          <span className="text-sm font-black text-[#22c55e]">+500 XP REWARD</span>
        </div>
        <div className="mt-5 flex items-center justify-between">
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
  const source = searchParams.get("source") ?? "execucao";
  const isFromHistory = source === "historico";

  const [data, setData] = useState<FinishedWorkoutSummary | null>(null);

  /** Lê e valida os dados do sessionStorage ao montar */
  useEffect(() => {
    const raw = sessionStorage.getItem("ATIVOFinishedWorkout");
    if (!raw) { router.replace(isFromHistory ? "/historico" : "/dashboard"); return; }
    try {
      const parsed = JSON.parse(raw) as FinishedWorkoutSummary;
      if (!parsed?.nomeTreino || !Array.isArray(parsed.exercicios)) throw new Error();
      setData(parsed);
    } catch {
      router.replace(isFromHistory ? "/historico" : "/dashboard");
    }
  }, [isFromHistory, router]);

  const totalSeries = useMemo(() => calcTotalSeries(data?.exercicios ?? []), [data]);
  const totalVolume = useMemo(() => calcVolume(data?.exercicios ?? []), [data]);
  const prExercicio = useMemo(() => data?.exercicios.find((e) => e.isPR), [data]);

  // Refs para PRCard e DesafioCard (captura DOM)
  const prRef = useRef<HTMLDivElement>(null);
  const desafioRef = useRef<HTMLDivElement>(null);

  // Hooks de compartilhamento
  const prShare      = useShareCard(prRef,      "kinetic-pr");
  const desafioShare = useShareCard(desafioRef,  "kinetic-desafio");

  // Streak usa Canvas 2D — sem captura DOM
  const streakShare  = useStreakShare(data, "kinetic-streak");

  const [aba, setAba] = useState<"cards" | "conquistas">("cards");
  const handleClose = () => router.push(isFromHistory ? "/historico" : "/dashboard");

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d1117]">
        <div className="text-sm text-white/40">Carregando resumo...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <button onClick={handleClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/60 ring-1 ring-white/10 transition hover:bg-white/10" aria-label="Voltar">
          <ArrowLeft size={17} />
        </button>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-[#22c55e]">Performance</span>
        <div className="h-9 w-9" />
      </div>

      {/* Seletor de abas */}
      <div className="mx-5 mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/5">
        {(["cards", "conquistas"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setAba(tab)}
            className={`rounded-xl py-2.5 text-xs font-black uppercase tracking-widest transition ${aba === tab ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"}`}
          >
            {tab === "cards" ? "Cards para postar" : "Minhas Conquistas"}
          </button>
        ))}
      </div>

      <div className="space-y-5 px-5 pb-32">

        {/* ── ABA 1: Cards para postar ── */}
        {aba === "cards" && (
          <>
            {prExercicio && (
              <div>
                <PRCard cardRef={prRef} exercicio={prExercicio} data={data} />
                <ShareButtons onDownload={prShare.handleDownload} onInstagram={prShare.handleShareInstagram} onWhatsApp={prShare.handleShareWhatsApp} />
              </div>
            )}

            {data.desafioConcluido && (
              <div>
                <DesafioCard cardRef={desafioRef} data={data} />
                <ShareButtons onDownload={desafioShare.handleDownload} onInstagram={desafioShare.handleShareInstagram} onWhatsApp={desafioShare.handleShareWhatsApp} />
              </div>
            )}

            {/*
              StreakCard usa Canvas 2D para gerar a imagem (drawStreakCard.ts).
              Os handlers são passados diretamente — sem ref de DOM necessária.
            */}
            <StreakCard
              streakAtual={data.streakAtual}
              melhorStreak={data.melhorStreak}
              totalDiasTreinados={data.totalDiasTreinados}
              dataTreino={data.dataTreino}
              onDownload={streakShare.handleDownload}
              onInstagram={streakShare.handleShareInstagram}
              onWhatsApp={streakShare.handleShareWhatsApp}
            />

            {/* Área de cards bloqueados */}
            {!prExercicio && !data.desafioConcluido && (
              <div className="rounded-2xl border border-dashed border-white/8 bg-white/[0.02] p-5 text-center">
                <div className="mb-2 text-sm font-bold text-white/30">Cards bloqueados</div>
                <p className="text-xs leading-relaxed text-white/18">
                  Complete desafios ou bata recordes para desbloquear mais cards
                </p>
              </div>
            )}
          </>
        )}

        {/* ── ABA 2: Minhas Conquistas ── */}
        {aba === "conquistas" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Duração",    value: formatDuration(data.duracaoSegundos) },
                { label: "Exercícios", value: String(data.exercicios.length) },
                { label: "Séries",     value: String(totalSeries) },
                { label: "Volume",     value: totalVolume > 0 ? `${totalVolume.toFixed(1)} kg` : "--" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl bg-[#111827] p-4 ring-1 ring-white/5">
                  <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-white/30">{label}</div>
                  <div className="text-2xl font-black text-white">{value}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-3 text-[9px] font-bold uppercase tracking-widest text-white/30">Resumo da sessão</div>
              <div className="space-y-2">
                {data.exercicios.map((item) => (
                  <div key={item.nome} className="flex items-center justify-between rounded-2xl bg-[#111827] px-4 py-3 ring-1 ring-white/5">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-white/90">
                        {item.nome}
                        {item.isPR && <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-black text-amber-400">PR</span>}
                      </div>
                      <div className="mt-0.5 text-xs text-white/40">
                        {item.series} séries · {item.repeticoes} reps · {item.carga ? `${item.carga}kg` : "--"}
                      </div>
                    </div>
                    {item.carga && (
                      <div className="text-xs font-bold text-[#22c55e]/70">
                        {(item.carga * item.series).toFixed(0)}kg
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={handleClose} className="rounded-2xl border border-white/10 bg-transparent py-4 text-xs font-black uppercase tracking-widest text-white/70 transition hover:bg-white/5">
                {isFromHistory ? "Fechar" : "Continuar"}
              </button>
              <button onClick={() => setAba("cards")} className="flex items-center justify-center gap-2 rounded-2xl bg-[#22c55e] py-4 text-xs font-black uppercase tracking-widest text-[#052e16] shadow-[0_8px_24px_rgba(34,197,94,0.3)] transition hover:bg-[#16a34a]">
                <Share2 size={14} /> Compartilhar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}