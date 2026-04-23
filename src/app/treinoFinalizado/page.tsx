"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Share2, X } from "lucide-react";
import toast from "react-hot-toast";

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

const formatDuration = (seconds: number) => {
  if (!seconds || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export default function TreinoFinalizadoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source") ?? "execucao";
  const isFromHistory = source === "historico";

  const [data, setData] = useState<FinishedWorkoutSummary | null>(null);

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

  const totalSeries = useMemo(
    () => (data?.exercicios ?? []).reduce((acc, item) => acc + (item.series || 0), 0),
    [data],
  );

  const totalVolume = useMemo(
    () =>
      (data?.exercicios ?? []).reduce(
        (acc, item) => acc + (item.carga && item.series ? item.carga * item.series : 0),
        0,
      ),
    [data],
  );

  const handleClose = () => {
    router.push(isFromHistory ? "/historico" : "/dashboard");
  };

  const handleShare = async () => {
    if (!data) return;

    const lines = [
      "Treino finalizado!",
      `${data.nomeTreino} - ${formatDate(data.dataTreino)}`,
      `Duracao: ${formatDuration(data.duracaoSegundos)}`,
      `Exercicios: ${data.exercicios.length}`,
      `Series: ${totalSeries}`,
      `Volume: ${totalVolume > 0 ? `${totalVolume.toFixed(1)} kg` : "--"}`,
    ];
    const text = lines.join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Treino finalizado",
          text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Resumo copiado para a area de transferencia.");
      }
    } catch {
      toast.error("Nao foi possivel compartilhar agora.");
    }
  };

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 pb-32 pt-6">
        <div className="text-center text-white/60">Carregando resumo...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-32 pt-5 sm:px-5 sm:pt-6">
      <div className="rounded-[30px] bg-[#101b31] p-5 ring-1 ring-white/10">
        <div className="flex items-start justify-between">
          <button
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/10"
            aria-label="Fechar tela"
          >
            <X size={18} />
          </button>

          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/70">
              Workout complete
            </div>
            <div className="mt-1 text-xs text-white/45">{formatDate(data.dataTreino)}</div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-300/30">
            <CheckCircle2 size={34} />
          </div>
          <h1 className="mt-5 text-3xl font-bold text-white">Excelente trabalho!</h1>
          <p className="mt-2 text-white/60">Voce concluiu mais um treino.</p>
          <div className="mt-3 inline-flex rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-300 ring-1 ring-blue-400/20">
            {data.nomeTreino}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#0b1427] p-3 ring-1 ring-white/5">
            <div className="text-[9px] uppercase tracking-[0.18em] text-white/40">Duracao</div>
            <div className="mt-1 text-2xl font-bold text-white">{formatDuration(data.duracaoSegundos)}</div>
          </div>
          <div className="rounded-2xl bg-[#0b1427] p-3 ring-1 ring-white/5">
            <div className="text-[9px] uppercase tracking-[0.18em] text-white/40">Exercicios</div>
            <div className="mt-1 text-2xl font-bold text-white">{data.exercicios.length}</div>
          </div>
          <div className="rounded-2xl bg-[#0b1427] p-3 ring-1 ring-white/5">
            <div className="text-[9px] uppercase tracking-[0.18em] text-white/40">Series</div>
            <div className="mt-1 text-2xl font-bold text-white">{totalSeries}</div>
          </div>
          <div className="rounded-2xl bg-[#0b1427] p-3 ring-1 ring-white/5">
            <div className="text-[9px] uppercase tracking-[0.18em] text-white/40">Volume</div>
            <div className="mt-1 text-2xl font-bold text-white">
              {totalVolume > 0 ? `${totalVolume.toFixed(1)} kg` : "--"}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="text-xs uppercase tracking-[0.16em] text-white/45">Resumo da sessao</div>
        {data.exercicios.map((item) => (
          <div key={item.nome} className="rounded-2xl bg-[#101b31] p-3 ring-1 ring-white/10">
            <div className="text-base font-semibold text-white/90">{item.nome}</div>
            <div className="mt-1 text-xs text-white/55">
              {item.series} series • {item.repeticoes} reps • {item.carga ? `${item.carga}kg` : "--"}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={handleShare}
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-[0_14px_36px_rgba(59,130,246,0.35)]"
        >
          <Share2 size={16} />
          Compartilhar
        </button>
        <button
          onClick={handleClose}
          className="rounded-2xl border border-white/15 bg-transparent py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white/85"
        >
          {isFromHistory ? "Fechar" : "Continuar"}
        </button>
      </div>
    </div>
  );
}
