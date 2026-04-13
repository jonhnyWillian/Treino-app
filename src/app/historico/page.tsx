"use client";

import { useEffect, useState } from "react";
import { listarHistorico } from "@/services/api";
import { History, Calendar, ChevronRight } from "lucide-react";
import Image from "next/image";

interface WorkoutHistory {
  id: number;
  NomeTreino: string;
  dataTreino: string;
  QtdExercicios: number;
  ExerciciosRealizados: string; // Vem como string separada por vírgula
}

export default function HistoricoPage() {
  const [historico, setHistorico] = useState<WorkoutHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await listarHistorico();
        setHistorico(data);
      } catch (err) {
        console.error("Erro ao carregar histórico:", err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <div className="w-full px-5 pb-32 pt-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="lg:hidden w-9 h-9" /> {/* Espaçador para o botão de menu fixo no mobile */}
        
        <div className="text-center">
          <div className="text-lg font-semibold tracking-widest text-emerald-400">
            HISTÓRICO
          </div>
        </div>
        <div className="relative h-9 w-9 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
          <Image src="/login-bg.jpg" alt="Perfil" fill className="object-cover opacity-90" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
        </div>
      ) : historico.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl ring-1 ring-white/10">
          <History size={48} className="mx-auto text-white/20 mb-4" />
          <p className="text-white/50">Nenhum treino realizado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {historico.map((item) => {
            const isExpanded = expandedId === item.id;
            const exercicios = item.ExerciciosRealizados 
              ? item.ExerciciosRealizados.split(",").map(s => s.trim()) 
              : [];

            return (
              <div
                key={item.id}
                className={`group relative overflow-hidden rounded-[26px] bg-white/5 ring-1 ring-white/10 transition-all duration-300 ${
                  isExpanded ? "bg-white/10 ring-emerald-400/30" : "hover:bg-white/10"
                }`}
              >
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full flex items-start justify-between p-5 text-left"
                >
                  <div className="space-y-1">
                    <h3 className={`text-lg font-semibold transition-colors ${
                      isExpanded ? "text-emerald-400" : "text-white group-hover:text-emerald-300"
                    }`}>
                      {item.NomeTreino}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-white/50">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(item.dataTreino)}
                      </span>
                      <span className="flex items-center gap-1">
                        <History size={12} />
                        {item.QtdExercicios} exercícios
                      </span>
                    </div>
                  </div>
                  <ChevronRight 
                    size={20} 
                    className={`text-white/20 transition-transform duration-300 ${
                      isExpanded ? "rotate-90 text-emerald-400" : "group-hover:text-white/50"
                    }`} 
                  />
                </button>

                {/* Detalhes Expandidos */}
                <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? "max-h-[500px] opacity-100 pb-5 px-5" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="pt-2 border-t border-white/5">
                    <div className="text-[10px] font-bold tracking-widest text-emerald-400/60 uppercase mb-3">
                      Exercícios Realizados
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {exercicios.map((ex, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/5"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                          <span className="text-sm text-white/80">{ex}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
