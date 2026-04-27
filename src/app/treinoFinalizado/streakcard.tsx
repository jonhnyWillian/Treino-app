"use client";

import { Flame, Download, Share2, MessageCircle, Star, Trophy } from "lucide-react";

/* ─────────────────────────────────────────────
   TIPOS
───────────────────────────────────────────── */

export type ExercicioResumo = {
  nome: string;
  series: number;
  repeticoes: string;
  carga: number | null;
  isPR?: boolean;
};

export type FinishedWorkoutSummary = {
  nomeTreino: string;
  dataTreino: string;
  duracaoSegundos: number;
  exercicios: ExercicioResumo[];
  streakAtual?: number;
  melhorStreak?: number;
  totalDiasTreinados?: number;
  desafioConcluido?: string;
};

type StreakCardProps = {
  streakAtual?: number;
  melhorStreak?: number;
  totalDiasTreinados?: number;
  dataTreino: string;
  onDownload: () => void;
  onInstagram: () => void;
  onWhatsApp: () => void;
};

/* ─────────────────────────────────────────────
   HELPERS — Funções utilitárias
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

const DIAS_SEMANA = ["S", "T", "Q", "Q", "S", "S", "D"] as const;

/* ─────────────────────────────────────────────
   COMPONENTES DE CARD
───────────────────────────────────────────── */

/** StreakCard — exibe o card de streak na tela */
export function StreakCard({
  streakAtual = 0,
  melhorStreak = 0,
  totalDiasTreinados = 0,
  dataTreino,
  onDownload,
  onInstagram,
  onWhatsApp,
}: StreakCardProps) {

  const diasNoCiclo = streakAtual % 7 === 0 && streakAtual > 0 ? 7 : streakAtual % 7;
  const progressoPct = Math.min(diasNoCiclo / 7, 1) * 100;
  const semanaAtual = Math.floor(streakAtual / 7) + 1;

  return (
    <div>
      <div className="relative rounded-[20px] bg-[#0f1f0f]" style={{ overflow: "hidden", border: "1px solid rgba(34,197,94,0.15)" }}>
        <div className="absolute left-0 right-0 top-0 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(34,197,94,0.5),transparent)" }} />
        <div className="relative z-10 p-6">
          <div className="mb-5 flex items-center gap-2">
            <Flame size={14} className="text-[#22c55e]" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#22c55e]">Active Streak</span>
            <div className="ml-auto rounded-full px-3 py-1" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)" }}>
              <span className="text-[9px] font-black text-[#22c55e]">SEMANA {semanaAtual}</span>
            </div>
          </div>
          <div className="mb-1 flex items-end gap-3">
            <span className="font-black leading-none text-white" style={{ fontSize: 88, letterSpacing: -4 }}>{streakAtual}</span>
            <div className="pb-3">
              <div className="text-2xl font-bold leading-none text-white/40">DIAS</div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">Seguidos no Foco</div>
            </div>
          </div>
          <div className="mb-5">
            <div className="mb-2 flex justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/30">Próxima conquista</span>
              <span className="text-[9px] font-bold text-[#22c55e]">{diasNoCiclo} / 7 dias</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full bg-[#22c55e] transition-all duration-700" style={{ width: `${progressoPct}%` }} />
            </div>
            <div className="mt-3 flex justify-between gap-1">
              {DIAS_SEMANA.map((dia, i) => {
                const concluido = i < diasNoCiclo;
                return (
                  <div key={i} className="flex h-7 flex-1 items-center justify-center rounded-lg" style={{ background: concluido ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.04)", border: `1px solid ${concluido ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.06)"}` }}>
                    <span className="text-[9px] font-bold" style={{ color: concluido ? "rgba(34,197,94,0.85)" : "rgba(255,255,255,0.2)" }}>{dia}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {[
              { label: "Melhor", value: melhorStreak, destaque: false },
              { label: "Atual", value: streakAtual, destaque: true },
              { label: "Total", value: totalDiasTreinados, destaque: false },
            ].map(({ label, value, destaque }, i) => (
              <div key={label} className="text-center" style={i === 1 ? { borderLeft: "1px solid rgba(255,255,255,0.06)", borderRight: "1px solid rgba(255,255,255,0.06)" } : {}}>
                <div className="text-lg font-black" style={{ color: destaque ? "#22c55e" : "#fff" }}>{value}</div>
                <div className="text-[8px] font-bold uppercase tracking-[0.1em] text-white/30">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[10px] font-black italic text-[#22c55e]/60">TREINOS</span>
            <span className="text-[9px] text-white/20">{formatDate(dataTreino)}</span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "rgba(34,197,94,0.4)" }} />
      </div>
      <ShareButtons onDownload={onDownload} onInstagram={onInstagram} onWhatsApp={onWhatsApp} />
    </div>
  );
}

/** WorkoutSummaryCard — card com resumo completo do treino */
export function WorkoutSummaryCard({ data, totalSeries, totalVolume, onDownload, onInstagram, onWhatsApp }: {
  data: FinishedWorkoutSummary;
  totalSeries: number;
  totalVolume: number;
  onDownload: () => void;
  onInstagram: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <div className="relative rounded-[20px] bg-[#0f1f0f] border border-white/5 overflow-hidden">
      <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-transparent via-[#22c55e]/50 to-transparent" />
      <div className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Trophy size={14} className="text-[#22c55e]" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#22c55e]">Treino Finalizado</span>
        </div>
        <h2 className="mb-6 text-3xl font-black text-white leading-tight">{data.nomeTreino}</h2>
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div>
            <div className="text-lg font-black text-white">{formatDuration(data.duracaoSegundos)}</div>
            <div className="text-[8px] font-bold uppercase tracking-widest text-white/30">Duração</div>
          </div>
          <div>
            <div className="text-lg font-black text-white">{totalSeries}</div>
            <div className="text-[8px] font-bold uppercase tracking-widest text-white/30">Séries</div>
          </div>
          <div>
            <div className="text-lg font-black text-white">{totalVolume > 0 ? `${totalVolume.toFixed(1)}kg` : "--"}</div>
            <div className="text-[8px] font-bold uppercase tracking-widest text-white/30">Volume</div>
          </div>
        </div>
        <div className="mb-4 h-px bg-white/5" />
        <div className="mb-3 text-[9px] font-bold uppercase tracking-widest text-white/30">Resumo da sessão</div>
        <div className="space-y-2 mb-6">
          {data.exercicios.slice(0, 4).map((ex) => (
            <div key={ex.nome} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2">
              <div className="text-xs font-bold text-white/90 truncate mr-2">{ex.nome}</div>
              <div className="text-[10px] text-white/40 whitespace-nowrap">{ex.series}s · {ex.carga ? `${ex.carga}kg` : "--"}</div>
            </div>
          ))}
          {data.exercicios.length > 4 && <div className="text-center text-[10px] italic text-white/20">+ {data.exercicios.length - 4} exercícios</div>}
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-[10px] font-bold italic text-[#22c55e]/70">TREINOS</span>
          <span className="text-[9px] text-white/25">{formatDate(data.dataTreino)}</span>
        </div>
        <ShareButtons onDownload={onDownload} onInstagram={onInstagram} onWhatsApp={onWhatsApp} />
      </div>
    </div>
  );
}

/** PRCard — card de novo recorde pessoal */
export function PRCard({ cardRef, exercicio, data, onDownload, onInstagram, onWhatsApp }: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  exercicio: ExercicioResumo;
  data: FinishedWorkoutSummary;
  onDownload: () => void;
  onInstagram: () => void;
  onWhatsApp: () => void;
}) {
  const cargaAnterior = exercicio.carga ? exercicio.carga - 5 : null;
  return (
    <div>
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
            <div><div className="text-[9px] font-bold uppercase tracking-widest text-white/30">Séries</div><div className="text-base font-black text-white">{exercicio.series}</div></div>
            <div><div className="text-[9px] font-bold uppercase tracking-widest text-white/30">Reps</div><div className="text-base font-black text-white">{exercicio.repeticoes}</div></div>
            {cargaAnterior && <div><div className="text-[9px] font-bold uppercase tracking-widest text-white/30">Evolução</div><div className="text-base font-black text-[#22c55e]">+{exercicio.carga! - cargaAnterior}kg</div></div>}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[10px] font-bold italic text-[#22c55e]/70">TREINOS</span>
            <span className="text-[9px] text-white/25">{formatDate(data.dataTreino)}</span>
          </div>
        </div>
      </div>
      <ShareButtons onDownload={onDownload} onInstagram={onInstagram} onWhatsApp={onWhatsApp} />
    </div>
  );
}

/** DesafioCard — card de desafio concluído */
export function DesafioCard({ cardRef, data, onDownload, onInstagram, onWhatsApp }: {
  cardRef: React.RefObject<HTMLDivElement | null>;
  data: FinishedWorkoutSummary;
  onDownload: () => void;
  onInstagram: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <div>
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
            <span className="text-[10px] font-bold italic text-[#22c55e]/70">TREINOS</span>
            <span className="text-[9px] text-white/25">{formatDate(data.dataTreino)}</span>
          </div>
        </div>
      </div>
      <ShareButtons onDownload={onDownload} onInstagram={onInstagram} onWhatsApp={onWhatsApp} />
    </div>
  );
}

/** ShareButtons — botões de compartilhamento padrão */
export function ShareButtons({ onDownload, onInstagram, onWhatsApp }: {
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
