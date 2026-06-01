"use client";

import { useState, useEffect, useMemo } from "react";
import { History, Dumbbell, Medal, Trophy } from "lucide-react";
import { listarRecordesPessoais, RecordePessoal } from "@/services/api";

export default function RecordesPage() {
  const [recordes, setRecordes] = useState<RecordePessoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);

  useEffect(() => {
    listarRecordesPessoais()
      .then(setRecordes)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const topMilestones = useMemo(
    () => [...recordes].sort((a, b) => b.carga - a.carga).slice(0, 3),
    [recordes]
  );

  const formatDate = (dateStr: string, includeYear = true) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      ...(includeYear && { year: "numeric" }),
    });
  };

  const toggleExpand = (exercicio: string) =>
    setExpandedEx((prev) => (prev === exercicio ? null : exercicio));

  const medalColors = [
    { bg: "bg-yellow-500/20", text: "text-yellow-400", ring: "ring-yellow-500/20" },
    { bg: "bg-slate-400/20",  text: "text-slate-300",  ring: "ring-slate-400/20"  },
    { bg: "bg-orange-500/20", text: "text-orange-400", ring: "ring-orange-500/20" },
  ];

  return (
    <div className="text-white flex flex-col gap-5">

      {/* PAGE HEADER */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recordes Pessoais</h1>
        <p className="mt-0.5 text-sm text-white/40">Seus melhores desempenhos registrados</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-white/40 text-sm">Carregando recordes...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_1fr]">

          {/* COLUNA ESQUERDA */}
          <div className="flex flex-col gap-4">

            {/* Card resumo */}
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 flex flex-col items-center text-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/20">
                <Trophy size={26} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{recordes.length}</p>
                <p className="text-xs text-white/40 mt-0.5">exercícios registrados</p>
              </div>
            </div>

            {/* Top 3 */}
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-5 flex flex-col gap-3">
              <div>
                <h2 className="text-sm font-bold text-white">Top 3 Cargas</h2>
                <p className="text-xs text-white/40 mt-0.5">Seus recordes mais pesados</p>
              </div>

              {topMilestones.length === 0 ? (
                <div className="py-8 text-center rounded-xl border border-dashed border-white/10">
                  <p className="text-white/30 text-xs">Nenhum recorde ainda</p>
                </div>
              ) : (
                topMilestones.map((recorde, idx) => {
                  const medal = medalColors[idx];
                  return (
                    <div key={`top-${idx}`} className="flex items-center justify-between rounded-xl bg-[#0d162c] p-4 ring-1 ring-white/5">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${medal.bg} ring-1 ${medal.ring} shrink-0`}>
                          <Medal size={16} className={medal.text} />
                        </div>
                        <span className="text-sm text-white/70 truncate max-w-[110px]">{recorde.exercicio}</span>
                      </div>
                      <div className="flex items-baseline gap-1 shrink-0">
                        <span className="text-xl font-black text-white">{recorde.carga}</span>
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">kg</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUNA DIREITA */}
          <div className="flex flex-col gap-4">

            {/* Stats row — mesmo padrão dos 4 cards do perfil */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                { label: "Total",       value: recordes.length,                                                cor: "text-emerald-400", sub: "exercícios" },
                { label: "Maior carga", value: recordes.length > 0 ? Math.max(...recordes.map(r => r.carga)) : "-", cor: "text-cyan-400", sub: recordes.length > 0 ? "kg" : "" },
                { label: "Novos PRs",   value: recordes.filter(r => r.isNovo).length,                         cor: "text-white",       sub: "esta semana" },
                { label: "Melhor",      value: topMilestones[0]?.exercicio?.split(" ")[0] ?? "-",              cor: "text-white",       sub: topMilestones[0] ? `${topMilestones[0].carga} kg` : "" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-[#111827] p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">{s.label}</p>
                  <p className={`mt-3 text-3xl font-black ${s.cor}`}>{s.value}</p>
                  {s.sub && <p className="mt-1 text-xs text-white/30">{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* Lista de exercícios */}
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-5 flex-1">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold">Histórico de Exercícios</h3>
                  <p className="text-xs text-white/40 mt-0.5">Clique para ver o histórico de cada exercício</p>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Dumbbell size={16} />
                </div>
              </div>

              {recordes.length === 0 ? (
                <div className="py-12 text-center rounded-xl border border-dashed border-white/10">
                  <Dumbbell size={28} className="mx-auto text-white/20 mb-2" />
                  <p className="text-white/30 text-sm">Nenhum exercício registrado ainda</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recordes.map((recorde) => (
                    <div
                      key={recorde.exercicio}
                      onClick={() => toggleExpand(recorde.exercicio)}
                      className="group rounded-xl bg-slate-900 ring-1 ring-white/5 hover:ring-emerald-400/20 transition-all cursor-pointer overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10 shrink-0 group-hover:bg-emerald-500/10 group-hover:ring-emerald-400/20 transition-all">
                            <Dumbbell size={16} className="text-white/40 group-hover:text-emerald-400 transition-colors" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                                {recorde.exercicio}
                              </h3>
                              {recorde.isNovo && (
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/20">
                                  New PR
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-white/30 mt-0.5 uppercase tracking-wider">
                              {formatDate(recorde.data, false)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-end gap-0.5 h-6">
                            {[0.4, 0.6, 0.5, 0.8, 1].map((h, i) => (
                              <div key={i} className={`w-1.5 rounded-full ${i === 4 ? "bg-emerald-400" : "bg-white/10"}`}
                                style={{ height: `${h * 100}%` }} />
                            ))}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xl font-black text-white">{recorde.carga}</span>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase ml-1">kg</span>
                          </div>
                        </div>
                      </div>

                      {expandedEx === recorde.exercicio && (
                        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <History size={12} className="text-emerald-400/60" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Recordes Anteriores</span>
                          </div>
                          {recorde.historico && recorde.historico.length > 0 ? (
                            recorde.historico.slice(0, 5).map((h, idx) => (
                              <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/5">
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] text-white/40 w-20">{formatDate(h.data, false)}</span>
                                  <div className="h-1 w-1 rounded-full bg-white/20" />
                                  <span className="text-xs font-bold text-white/80">{h.carga} kg</span>
                                </div>
                                <span className="text-[10px] text-white/30">{h.repeticoes} reps</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[10px] text-white/20 italic px-3">Sem histórico registrado</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}