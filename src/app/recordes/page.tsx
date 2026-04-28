"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, History, Menu, Dumbbell, Medal } from "lucide-react";
import { listarRecordesPessoais, RecordePessoal } from "@/services/api";
import { useNav } from "@/components/navWrapper";
import { useRouter } from "next/navigation";

export default function RecordesPage() {
  const router = useRouter();
  const { openSidebar } = useNav();
  const [recordes, setRecordes] = useState<RecordePessoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await listarRecordesPessoais();
        setRecordes(data);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const topMilestones = useMemo(() => {
    return [...recordes]
      .sort((a, b) => b.carga - a.carga)
      .slice(0, 3);
  }, [recordes]);

  const formatDate = (dateStr: string, includeYear = true) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      ...(includeYear && { year: "numeric" }),
    });
  };

  const toggleExpand = (exercicio: string) => {
    setExpandedEx(expandedEx === exercicio ? null : exercicio);
  };

  return (
    <div className="w-full px-4 pb-32 pt-4 sm:px-5 sm:pt-6">
      {/* Header atualizado: Botão menu (esquerda), Título e Voltar (direita) */}
      <div className="mb-8 flex items-center justify-between">
        <button
          onClick={openSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>

        <div className="text-right flex items-center gap-4">
          <h1 className="text-xl font-bold text-emerald-400">Recordes</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full p-2 text-white/80 hover:text-white hover:bg-white/5 transition ring-1 ring-white/10"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-white/40 text-sm font-medium">Carregando seus marcos...</p>
        </div>
      ) : (
        <>
          {/* Section: Estatísticas Elite / Principais recordes */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">Estatísticas</p>
                <h2 className="text-2xl font-bold text-white">Principais recordes</h2>
              </div>              
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {topMilestones.map((recorde, idx) => (
                <div
                  key={`top-${idx}`}
                  className="min-w-[240px] relative overflow-hidden rounded-[32px] bg-[#111d33] p-6 ring-1 ring-white/10"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20">
                      <Medal size={24} className="text-emerald-400" />
                    </div>
                    <span className="text-xs font-medium text-white/40">{recorde.exercicio}</span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-black text-white">{recorde.carga}</span>
                    <span className="text-xl font-bold text-emerald-400 uppercase">KG</span>
                  </div>
                  
                </div>
              ))}
              {topMilestones.length === 0 && (
                <div className="w-full text-center py-10 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <p className="text-white/30 text-sm">Nenhum recorde ainda</p>
                </div>
              )}
            </div>
          </div>

          {/* Section: Exercise History */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-white mb-6">Histórico de exercícios</h2>
            
            <div className="grid gap-4">
              {recordes.map((recorde) => (
                <div
                  key={recorde.exercicio}
                  onClick={() => toggleExpand(recorde.exercicio)}
                  className="group relative overflow-hidden rounded-3xl bg-[#0f172a] p-4 ring-1 ring-white/5 transition-all hover:bg-[#1e293b] cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                        <Dumbbell size={22} className="text-white/60 group-hover:text-emerald-400 transition-colors" />
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {recorde.exercicio}
                          </h3>
                          {recorde.isNovo && (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/20">
                              New PR
                            </span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-white">{recorde.carga}</span>
                          <span className="text-[10px] font-bold text-white/40 uppercase">kg</span>
                        </div>
                        <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider mt-1">
                          Persistir: {formatDate(recorde.data).toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-end gap-1 h-8">
                      {[0.4, 0.6, 0.5, 0.8, 1].map((h, i) => (
                        <div 
                          key={i} 
                          className={`w-1.5 rounded-full transition-all duration-500 ${
                            i === 4 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'bg-white/10'
                          }`}
                          style={{ height: `${h * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Lista de Marcas Anteriores (Expansível) */}
                  {expandedEx === recorde.exercicio && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 mb-2">
                        <History size={12} className="text-emerald-400/60" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Recordes Anteriores</span>
                      </div>
                      {recorde.historico && recorde.historico.length > 0 ? (
                        recorde.historico.slice(0, 5).map((h, idx) => (
                          <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/5">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-medium text-white/40 w-16">{formatDate(h.data, false)}</span>
                              <div className="h-1 w-1 rounded-full bg-white/20" />
                              <span className="text-xs font-bold text-white/80">{h.carga}kg</span>
                            </div>
                            <span className="text-[10px] font-medium text-white/30">{h.repeticoes} reps</span>
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
          </div> 
        </>
      )}
    </div>
  );
}
