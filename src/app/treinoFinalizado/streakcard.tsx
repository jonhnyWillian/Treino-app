"use client";

/**
 * StreakCard
 *
 * Componente com responsabilidades separadas:
 *
 * 1. VISUAL (JSX) — exibe o card na tela com Tailwind CSS.
 *    Os dados são recebidos via props (streakAtual, melhorStreak, etc).
 *
 * 2. COMPARTILHAMENTO — ao clicar em Download/Instagram/WhatsApp,
 *    a imagem é gerada via Canvas 2D API (drawStreakCard.ts).
 *    NÃO usa captura DOM — evita problemas com CSS moderno do Tailwind v4.
 *
 * FLUXO DE DADOS:
 * page.tsx → StreakCard (props) → visual HTML + botões
 *         → streakShare.toCanvas() → drawStreakCard() → Canvas 2D
 *         → PNG para compartilhamento
 *
 * PROPS:
 *   - streakAtual: dias seguidos treinando (default 0)
 *   - melhorStreak: maior streak já alcançado (default 0)
 *   - totalDiasTreinados: total histórico de dias (default 0)
 *   - dataTreino: string ISO da data (ex: "2025-04-24")
 *   - onDownload / onInstagram / onWhatsApp: callbacks dos handlers de compartilhamento
 */

import { Flame, Download, Share2, MessageCircle } from "lucide-react";

/* ─────────────────────────────────────────────
   TIPOS
───────────────────────────────────────────── */

/**
 * StreakCardProps
 * Define as props esperadas pelo componente.
 * Todos os valores numéricos têm defaults para evitar undefined.
 */
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

/**
 * formatDate
 * Formata string ISO para o padrão brasileiro DD/MM/AAAA.
 * Exemplo: "2025-04-24" → "24/04/2025"
 * Exibido no rodapé do card junto com o logo KINETIC.
 */
const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

/**
 * DIAS_SEMANA
 * Array com as iniciais dos dias da semana em português.
 * Usado para renderizar o mini calendário semanal de 7 dias.
 * Layout: Segunda → Domingo (array index 0-6)
 */
const DIAS_SEMANA = ["S", "T", "Q", "Q", "S", "S", "D"] as const;

/* ─────────────────────────────────────────────
   COMPONENTE
───────────────────────────────────────────── */

export default function StreakCard({
  streakAtual = 0,
  melhorStreak = 0,
  totalDiasTreinados = 0,
  dataTreino,
  onDownload,
  onInstagram,
  onWhatsApp,
}: StreakCardProps) {

  /**
   * diasNoCiclo
   * Calcula quantos dias foram concluídos no ciclo semanal ATUAL.
   * Se streakAtual é múltiplo de 7 (ex: 7, 14, 21), o ciclo está completo → 7 dias.
   * Caso contrário, usa o resto (streakAtual % 7) → quantos dias foram feitos nesta semana.
   *
   * Exemplos:
   * - streakAtual = 5  → diasNoCiclo = 5 (semana incompleta)
   * - streakAtual = 7  → diasNoCiclo = 7 (primeira semana completa)
   * - streakAtual = 10 → diasNoCiclo = 3 (segunda semana, 3º dia)
   * - streakAtual = 14 → diasNoCiclo = 7 (segunda semana completa)
   */
  const diasNoCiclo =
    streakAtual % 7 === 0 && streakAtual > 0 ? 7 : streakAtual % 7;

  /**
   * progressoPct
   * Percentual de progresso para a próxima conquista semanal (0–100%).
   * Usado para preencher a barra de progresso visualmente.
   *
   * Fórmula: (diasNoCiclo / 7) * 100
   * Math.min garante que não ultrapasse 100% mesmo se houver arredondamento.
   *
   * Exemplos:
   * - diasNoCiclo = 1 → progressoPct ≈ 14%
   * - diasNoCiclo = 3 → progressoPct ≈ 43%
   * - diasNoCiclo = 7 → progressoPct = 100%
   */
  const progressoPct = Math.min(diasNoCiclo / 7, 1) * 100;

  /**
   * semanaAtual
   * Número da semana atual no streak total.
   * Começa em 1 (primeira semana).
   *
   * Fórmula: Math.floor(streakAtual / 7) + 1
   *
   * Exemplos:
   * - streakAtual = 1-7   → semanaAtual = 1
   * - streakAtual = 8-14  → semanaAtual = 2
   * - streakAtual = 15-21 → semanaAtual = 3
   */
  const semanaAtual = Math.floor(streakAtual / 7) + 1;

  return (
    <div>
      {/* ── CARD VISUAL (exibido na tela) ── */}
      <div
        className="relative rounded-[20px] bg-[#0f1f0f]"
        style={{ overflow: "hidden", border: "1px solid rgba(34,197,94,0.15)" }}
      >
        {/* Linha brilhante no topo — efeito visual sutil */}
        <div
          className="absolute left-0 right-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg,transparent,rgba(34,197,94,0.5),transparent)",
          }}
        />

        <div className="relative z-10 p-6">
          {/* ── HEADER: Ícone + Label + Badge de semana ── */}
          <div className="mb-5 flex items-center gap-2">
            {/* Ícone de chama (Flame) com cor verde */}
            <Flame size={14} className="text-[#22c55e]" />

            {/* Label "ACTIVE STREAK" em verde */}
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#22c55e]">
              Active Streak
            </span>

            {/* Badge "SEMANA X" alinhado à direita */}
            <div
              className="ml-auto rounded-full px-3 py-1"
              style={{
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.3)",
              }}
            >
              <span className="text-[9px] font-black text-[#22c55e]">
                SEMANA {semanaAtual}
              </span>
            </div>
          </div>

          {/* ── NÚMERO GRANDE DE DIAS ── */}
          <div className="mb-1 flex items-end gap-3">
            {/* streakAtual em tamanho gigante (88px) */}
            <span
              className="font-black leading-none text-white"
              style={{ fontSize: 88, letterSpacing: -4 }}
            >
              {streakAtual}
            </span>

            {/* "DIAS" e "SEGUIDOS NO FOCO" ao lado do número */}
            <div className="pb-3">
              <div className="text-2xl font-bold leading-none text-white/40">
                DIAS
              </div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.15em] text-white/25">
                Seguidos no Foco
              </div>
            </div>
          </div>

          {/* ── BARRA DE PROGRESSO + MINI CALENDÁRIO ── */}
          <div className="mb-5">
            {/* Labels da barra de progresso */}
            <div className="mb-2 flex justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/30">
                Próxima conquista
              </span>
              {/* Contador de dias (ex: "3 / 7 dias") */}
              <span className="text-[9px] font-bold text-[#22c55e]">
                {diasNoCiclo} / 7 dias
              </span>
            </div>

            {/* Barra de progresso visual */}
            <div
              className="h-1 overflow-hidden rounded-full"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              {/* Preenchimento da barra — width dinâmica baseada em progressoPct */}
              <div
                className="h-full rounded-full bg-[#22c55e] transition-all duration-700"
                style={{ width: `${progressoPct}%` }}
              />
            </div>

            {/* MINI CALENDÁRIO SEMANAL (7 células para S, T, Q, Q, S, S, D) */}
            <div className="mt-3 flex justify-between gap-1">
              {DIAS_SEMANA.map((dia, i) => {
                /**
                 * concluido
                 * True se o índice atual (i) é menor que diasNoCiclo.
                 * Indica que este dia foi completado nesta semana.
                 *
                 * Exemplos:
                 * - diasNoCiclo = 3, i = 0 → concluido = true  (Segunda concluída)
                 * - diasNoCiclo = 3, i = 1 → concluido = true  (Terça concluída)
                 * - diasNoCiclo = 3, i = 2 → concluido = true  (Quarta concluída)
                 * - diasNoCiclo = 3, i = 3 → concluido = false (Quinta não concluída)
                 * - diasNoCiclo = 3, i = 4-6 → concluido = false
                 */
                const concluido = i < diasNoCiclo;

                return (
                  <div
                    key={i}
                    className="flex h-7 flex-1 items-center justify-center rounded-lg"
                    style={{
                      // Se concluído: verde claro. Se não: cinza escuro.
                      background: concluido
                        ? "rgba(34,197,94,0.15)"
                        : "rgba(255,255,255,0.04)",
                      border: `1px solid ${
                        concluido
                          ? "rgba(34,197,94,0.35)"
                          : "rgba(255,255,255,0.06)"
                      }`,
                    }}
                  >
                    {/* Letra do dia (S, T, Q, etc) em cor verde se concluído */}
                    <span
                      className="text-[9px] font-bold"
                      style={{
                        color: concluido
                          ? "rgba(34,197,94,0.85)"
                          : "rgba(255,255,255,0.2)",
                      }}
                    >
                      {dia}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── STATS: Melhor / Atual / Total ── */}
          <div
            className="grid grid-cols-3 gap-2 pt-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            {/**
             * Renderiza 3 colunas de estatísticas:
             * 1. Melhor (melhorStreak)
             * 2. Atual (streakAtual) — destaque em verde
             * 3. Total (totalDiasTreinados)
             */}
            {[
              { label: "Melhor", value: melhorStreak, destaque: false },
              { label: "Atual", value: streakAtual, destaque: true },
              { label: "Total", value: totalDiasTreinados, destaque: false },
            ].map(({ label, value, destaque }, i) => (
              <div
                key={label}
                className="text-center"
                // Coluna central (i === 1) tem separadores nas laterais
                style={
                  i === 1
                    ? {
                        borderLeft: "1px solid rgba(255,255,255,0.06)",
                        borderRight: "1px solid rgba(255,255,255,0.06)",
                      }
                    : {}
                }
              >
                {/* Número grande — verde se destaque (ATUAL), branco caso contrário */}
                <div
                  className="text-lg font-black"
                  style={{ color: destaque ? "#22c55e" : "#fff" }}
                >
                  {value}
                </div>

                {/* Label do stat em cinza claro */}
                <div className="text-[8px] font-bold uppercase tracking-[0.1em] text-white/30">
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* ── RODAPÉ: marca KINETIC + data do treino ── */}
          <div className="mt-4 flex items-center justify-between">
            {/* Logo da app "KINETIC" em itálico */}
            <span className="text-[10px] font-black italic text-[#22c55e]/60">
              KINETIC
            </span>

            {/* Data formatada (DD/MM/AAAA) em cinza claro */}
            <span className="text-[9px] text-white/20">
              {formatDate(dataTreino)}
            </span>
          </div>
        </div>

        {/* Linha verde na base do card */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: "rgba(34,197,94,0.4)" }}
        />
      </div>

      {/* ── BOTÕES DE COMPARTILHAMENTO ──
          Chamam drawStreakCard() via Canvas 2D (não captura DOM).
          Garante imagem perfeita independente do CSS da página. */}
      <div className="mt-3 flex items-center gap-2">
        {/* Botão Download — ícone de seta para baixo */}
        <button
          onClick={onDownload}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-white/50 ring-1 ring-white/10 transition hover:bg-white/10"
          title="Download PNG"
        >
          <Download size={16} />
        </button>

        {/* Botão Instagram — ocupa o espaço central, verde de destaque */}
        <button
          onClick={onInstagram}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#22c55e] text-xs font-black uppercase tracking-widest text-[#052e16] transition hover:bg-[#16a34a]"
          title="Compartilhar no Instagram"
        >
          <Share2 size={14} />
          Instagram
        </button>

        {/* Botão WhatsApp / outros apps — ícone de bolha de chat */}
        <button
          onClick={onWhatsApp}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-white/50 ring-1 ring-white/10 transition hover:bg-white/10"
          title="Compartilhar no WhatsApp"
        >
          <MessageCircle size={16} />
        </button>
      </div>
    </div>
  );
}