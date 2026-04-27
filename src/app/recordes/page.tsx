"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Star, Calendar, ChevronRight, TrendingUp, History } from "lucide-react";
import { listarRecordesPessoais, RecordePessoal } from "@/services/api";

export default function RecordesPage() {
  const [recordes, setRecordes] = useState<RecordePessoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecordes() {
      try {
        const data = await listarRecordesPessoais();
        setRecordes(data);
      } catch (error) {
        console.error("Erro ao buscar recordes:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchRecordes();
  }, []);

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
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/80 backdrop-blur-md px-4 py-6">
        <div className="mx-auto max-w-3xl flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Recordes Pessoais</h1>
            <p className="text-xs text-white/40 uppercase tracking-widest">Sua evolução constante</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 mt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <p className="text-white/40 text-sm font-medium">Carregando seus marcos...</p>
          </div>
        ) : recordes.length > 0 ? (
          <div className="grid gap-4">
            {recordes.map((recorde) => (
              <div
                key={recorde.exercicio}
                className="group relative overflow-hidden rounded-3xl bg-[#111d33] ring-1 ring-white/10 transition-all hover:ring-blue-500/30"
              >
                {/* Background Decor */}
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-500/5 blur-2xl group-hover:bg-blue-500/10 transition-colors" />
                
                <div className="relative p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {recorde.isNovo && (
                          <div className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 ring-1 ring-blue-500/40">
                            <Star size={8} fill="#3b82f6" className="text-blue-500" />
                            <span className="text-[8px] font-black uppercase tracking-wider text-blue-400">Novo</span>
                          </div>
                        )}
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
                          Exercício
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-white leading-tight group-hover:text-blue-400 transition-colors">
                        {recorde.exercicio}
                      </h3>
                      
                      <div className="mt-4 flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-white/40">
                          <Calendar size={12} />
                          <span className="text-[10px] font-medium">{formatDate(recorde.data)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/40">
                          <Trophy size={12} className="text-blue-400/60" />
                          <span className="text-[10px] font-medium">{recorde.repeticoes} reps</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="text-3xl font-black text-blue-400 group-hover:scale-110 transition-transform">
                        {recorde.carga}
                        <span className="ml-1 text-sm font-bold text-white/40">kg</span>
                      </div>
                      <div className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/20">
                        Carga Máxima
                      </div>
                    </div>
                  </div>

                  {/* Evolução / Histórico Toggle */}
                  {recorde.historico && recorde.historico.length > 0 && (
                    <div className="mt-5 border-t border-white/5 pt-4">
                      <button
                        onClick={() => toggleExpand(recorde.exercicio)}
                        className="flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white/60 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <History size={12} />
                          <span>Marcas Anteriores</span>
                        </div>
                        <ChevronRight 
                          size={14} 
                          className={`transition-transform duration-300 ${expandedEx === recorde.exercicio ? "rotate-90" : ""}`} 
                        />
                      </button>

                      {expandedEx === recorde.exercicio && (
                        <div className="mt-3 space-y-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                          {recorde.historico.map((h, i) => (
                            <div 
                              key={i} 
                              className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 ring-1 ring-white/5"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                                  <TrendingUp size={10} />
                                </div>
                                <div className="text-[11px] font-bold text-white/80">
                                  {h.carga}kg <span className="text-white/30 font-medium">· {h.repeticoes} reps</span>
                                </div>
                              </div>
                              <div className="text-[9px] font-medium text-white/25">
                                {formatDate(h.data, false)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/5 text-white/20">
              <Trophy size={32} />
            </div>
            <h3 className="text-lg font-bold text-white">Nenhum recorde ainda</h3>
            <p className="mt-2 text-sm text-white/40 max-w-[240px]">
              Continue treinando e registrando suas cargas para ver sua evolução aqui!
            </p>
            <Link 
              href="/treino"
              className="mt-8 rounded-full bg-blue-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
            >
              Iniciar Treino
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
