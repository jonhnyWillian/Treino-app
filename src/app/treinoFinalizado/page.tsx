"use client";

/**
 * TreinoFinalizadoPage
 *
 * Tela exibida ao concluir (ou revisar pelo histórico) um treino.
 * Possui duas abas:
 *   1. "Cards para postar"  → gera imagens visuais (Resumo, PR, Desafio, Streak)
 *   2. "Minhas Conquistas"  → lista resumida dos exercícios da sessão
 *
 * Geração de imagem:
 *   - PRCard e DesafioCard: dom-to-image-more (captura DOM)
 *   - StreakCard e WorkoutSummaryCard: Canvas 2D API via drawstreakcard.ts — sem captura DOM
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Share2 } from "lucide-react";
import toast from "react-hot-toast";

import { 
  WorkoutSummaryCard, 
  PRCard, 
  DesafioCard, 
  type FinishedWorkoutSummary,
  type ExercicioResumo
} from "./streakcard";

import { drawWorkoutCard } from "./drawstreakcard";

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const calcTotalSeries = (exercicios: ExercicioResumo[]): number =>
  exercicios.reduce((acc, e) => acc + (e.series || 0), 0);

const calcVolume = (exercicios: ExercicioResumo[]): number =>
  exercicios.reduce(
    (acc, e) => acc + (e.carga && e.series ? e.carga * e.series : 0),
    0
  );

/* ─────────────────────────────────────────────
   HOOKS DE COMPARTILHAMENTO
───────────────────────────────────────────── */

/**
 * useShareCard
 * Captura um elemento DOM e converte para PNG via dom-to-image-more.
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
      await navigator.share({ files: [file], title: "KINETIC — Treino" });
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

/**
 * useWorkoutShare
 */
function useWorkoutShare(data: FinishedWorkoutSummary | null, filename: string, totalSeries: number, totalVolume: number) {
  const toCanvas = useCallback((): HTMLCanvasElement | null => {
    if (!data) return null;
    const canvas = document.createElement("canvas");
    drawWorkoutCard(canvas, {
      nomeTreino: data.nomeTreino,
      dataTreino: data.dataTreino,
      duracao: formatDuration(data.duracaoSegundos),
      totalSeries,
      volume: totalVolume > 0 ? `${totalVolume.toFixed(1)}kg` : "--",
      exercicios: data.exercicios.map(ex => ({
        nome: ex.nome,
        info: `${ex.series} séries · ${ex.carga ? `${ex.carga}kg` : "--"}`,
        isPR: ex.isPR
      }))
    });
    return canvas;
  }, [data, totalSeries, totalVolume]);

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
      await navigator.share({ files: [file] });
    }
  }, [toCanvas, filename]);

  const handleShareWhatsApp = useCallback(async () => {
    const canvas = toCanvas();
    if (!canvas) return;
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
    const file = new File([blob], `${filename}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
    }
  }, [toCanvas, filename]);

  return { handleDownload, handleShareInstagram, handleShareWhatsApp };
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

  useEffect(() => {
    // Timeout para evitar o erro "Calling setState synchronously within an effect"
    const timer = setTimeout(() => {
      const raw = sessionStorage.getItem("ATIVOFinishedWorkout");
      if (!raw) {
        router.replace(isFromHistory ? "/historico" : "/dashboard");
        return;
      }
      try {
        const parsed = JSON.parse(raw) as FinishedWorkoutSummary;
        setData(parsed);
      } catch {
        router.replace(isFromHistory ? "/historico" : "/dashboard");
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isFromHistory, router]);

  const totalSeries = useMemo(() => calcTotalSeries(data?.exercicios ?? []), [data]);
  const totalVolume = useMemo(() => calcVolume(data?.exercicios ?? []), [data]);
  const prExercicio = useMemo(() => data?.exercicios.find((e) => e.isPR), [data]);

  const prRef = useRef<HTMLDivElement>(null);
  const desafioRef = useRef<HTMLDivElement>(null);

  const prShare      = useShareCard(prRef,      "kinetic-pr");
  const desafioShare = useShareCard(desafioRef,  "kinetic-desafio");
  const workoutShare = useWorkoutShare(data, "kinetic-resumo", totalSeries, totalVolume);

  const [aba, setAba] = useState<"cards" | "conquistas">("cards");
  const handleClose = () => router.push(isFromHistory ? "/historico" : "/dashboard");

  if (!data) return null;

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <div className="flex items-center justify-between px-5 pb-4 pt-5">
        <button onClick={handleClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/60 ring-1 ring-white/10 transition hover:bg-white/10">
          <ArrowLeft size={17} />
        </button>
        <span className="text-xs font-black uppercase tracking-[0.2em] text-[#22c55e]">Performance</span>
        <div className="h-9 w-9" />
      </div>

      <div className="mx-5 mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/5">
        {(["cards", "conquistas"] as const).map((tab) => (
          <button key={tab} onClick={() => setAba(tab)} className={`rounded-xl py-2.5 text-xs font-black uppercase tracking-widest transition ${aba === tab ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"}`}>
            {tab === "cards" ? "Cards para postar" : "Minhas Conquistas"}
          </button>
        ))}
      </div>

      <div className="space-y-5 px-5 pb-32">
        {aba === "cards" && (
          <>
            <WorkoutSummaryCard data={data} totalSeries={totalSeries} totalVolume={totalVolume} onDownload={workoutShare.handleDownload} onInstagram={workoutShare.handleShareInstagram} onWhatsApp={workoutShare.handleShareWhatsApp} />
            
            {prExercicio && (
              <PRCard cardRef={prRef} exercicio={prExercicio} data={data} onDownload={prShare.handleDownload} onInstagram={prShare.handleShareInstagram} onWhatsApp={prShare.handleShareWhatsApp} />
            )}

            {data.desafioConcluido && (
              <DesafioCard cardRef={desafioRef} data={data} onDownload={desafioShare.handleDownload} onInstagram={desafioShare.handleShareInstagram} onWhatsApp={desafioShare.handleShareWhatsApp} />
            )}
          </>
        )}

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

            <div className="space-y-2">
              <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-white/30">Resumo da sessão</div>
              {data.exercicios.map((item) => (
                <div key={item.nome} className="flex items-center justify-between rounded-2xl bg-[#111827] px-4 py-3 ring-1 ring-white/5">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-white/90">
                      {item.nome}
                      {item.isPR && <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-black text-amber-400">PR</span>}
                    </div>
                    <div className="mt-0.5 text-xs text-white/40">{item.series} séries · {item.repeticoes} reps · {item.carga ? `${item.carga}kg` : "--"}</div>
                  </div>
                  {item.carga && <div className="text-xs font-bold text-[#22c55e]/70">{(item.carga * item.series).toFixed(0)}kg</div>}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={handleClose} className="rounded-2xl border border-white/10 py-4 text-xs font-black uppercase tracking-widest text-white/70 transition hover:bg-white/5">
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
