"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Dumbbell, Timer, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardResumo,  type DashboardResumoResponse } from "@/services/api";
import RotaProtegida from "@/components/ui/RotaProtegida";

// ─── Constantes ───────────────────────────────────────────────────────────────

// Classes base compartilhadas entre os cards de estatística.
// Extraídas aqui para evitar repetição nos 4 cards do grid de stats.
const STAT_CARD_CLS =
  "rounded-2xl border border-white/10 bg-[#111827] p-5";

const STAT_LABEL_CLS =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30";

const STAT_SUBLABEL_CLS =
  "mt-1 text-xs text-white/30";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Retorna uma saudação com base na hora atual do dia.
 * Divide o dia em três períodos: manhã (até 12h), tarde (até 18h) e noite (18h+).
 */
function getGreetingByHour(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Formata uma duração em segundos para string legível em horas e minutos.
 * Retorna "--" para valores inválidos ou zerados — evita exibir "0 min"
 * quando o usuário ainda não tem treinos registrados.
 *
 * Exemplos: 3720 → "1h 2m" | 900 → "15 min"
 */
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "--";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
}

/**
 * Formata uma string de data ISO para exibição localizada em pt-BR.
 * Exibe dia, mês abreviado, hora e minuto — formato compacto para o card
 * de último treino.
 *
 * Exemplo: "2024-06-15T14:30:00Z" → "15 de jun. 14:30"
 */
function formatDateTime(date: string): string {
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/**
 * Card de estatística individual.
 * Recebe label (título), valor e sublabel (unidade/contexto).
 * A cor do valor é passada via `valueColor` para manter cada card
 * com sua identidade visual sem duplicar classes.
 */
interface StatCardProps {
  label: string;
  value: string | number;
  subLabel: string;
  valueColor: string;
}

function StatCard({ label, value, subLabel, valueColor }: StatCardProps) {
  return (
    <div className={STAT_CARD_CLS}>
      <p className={STAT_LABEL_CLS}>{label}</p>
      <p className={`mt-2 text-3xl font-black ${valueColor}`}>{value}</p>
      <p className={STAT_SUBLABEL_CLS}>{subLabel}</p>
    </div>
  );
}

// ─── Conteúdo principal do Dashboard ─────────────────────────────────────────

/**
 * DashboardContent é o componente interno que contém toda a lógica e UI
 * do dashboard. É envolvido por `DashboardPage` com `RotaProtegida` para
 * garantir que só renderiza quando o usuário está autenticado.
 *
 * Fluxo de dados:
 * 1. `usuario` vem do AuthContext (populado pelo cookie via getPerfil no AuthProvider).
 * 2. `getPerfil` é chamado aqui também para garantir nome atualizado após reload.
 * 3. `getDashboardResumo` busca os dados de treinos, volume, duração e recordes.
 */
function DashboardContent() {
  const { usuario } = useAuth();

  // Nome derivado diretamente do contexto — sem useState intermediário
  // que causaria o erro de setState síncrono dentro de useEffect
  const primeiroNome = usuario?.nome?.split(" ")[0] ?? "Atleta";

  const [dashboardData, setDashboardData] = useState<DashboardResumoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState(getGreetingByHour); // função inicializadora


  // Carrega dados da API ao montar o componente.
  // getPerfil() garante o nome mais recente mesmo se o contexto ainda estiver
  // sendo populado; getDashboardResumo() traz os dados de treinos da semana.
  useEffect(() => {
    const timeout = setTimeout(async () => {
      const resumo = await getDashboardResumo();
      setDashboardData(resumo);
      setLoading(false);
    }, 0);

    return () => clearTimeout(timeout);
  }, []);

  // Atualiza a saudação a cada minuto para cobrir mudanças de período
  // sem precisar recarregar a página (ex: passou das 12h com a tela aberta).
  useEffect(() => {
    const interval = setInterval(() => {
      setGreeting(getGreetingByHour());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  // Dados da semana com fallback para array vazio durante o carregamento
  const weekData = dashboardData?.semana ?? [];

  // Máximo da semana para normalizar a altura das barras do gráfico.
  // Mínimo 1 evita divisão por zero quando não há treinos registrados.
  const maxWeek = Math.max(...weekData.map((d) => d.treinos), 1);

  return (
    <div className="text-white grid grid-cols-1 gap-4 lg:grid-cols-2 lg:grid-rows-[auto_auto_1fr_1fr] lg:items-start">

      {/* ── HEADER ── */}
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400">
              Dashboard
            </p>
{/*
            <h1 className="mt-2 text-3xl font-black leading-none">
              {greeting},{" "}
               Exibe apenas o primeiro nome para o cabeçalho ficar compacto 
              <span className="text-blue-400">
                {userName.split(" ")[0]}
              </span>
            </h1>
*/}
            <p className="mt-2 text-sm text-white/40">
              Seu corpo é o reflexo da sua disciplina.
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/treino"
              className="flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold hover:bg-blue-500 transition"
            >
              <Dumbbell size={16} />
              Treinar
            </Link>

            <Link
              href="/historico"
              className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white/70 hover:bg-white/10 transition"
            >
              <Trophy size={16} />
              Histórico
            </Link>
          </div>

        </div>
      </div>

      {/* ── STATS ── */}
      {/* Grid de 4 cards com métricas resumidas da semana */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">

        <StatCard
          label="Sequência"
          value={dashboardData?.resumo.totalTreinos ?? 0}
          subLabel="dias seguidos"
          valueColor="text-orange-400"
        />

        <StatCard
          label="Volume"
          value={(dashboardData?.resumo.totalVolumeKg ?? 0).toFixed(0)}
          subLabel="kg semana"
          valueColor="text-emerald-400"
        />

        <StatCard
          label="Duração"
          value={formatDuration(dashboardData?.resumo.totalDuracaoSegundos ?? 0)}
          subLabel="total semanal"
          valueColor="text-cyan-400"
        />

        <StatCard
          label="Recorde"
          value={dashboardData?.destaques.recordeCargaKg ?? 0}
          subLabel="kg máximo"
          valueColor="text-blue-400"
        />

      </div>

      {/* ── PRÓXIMO TREINO ── */}
      {/* Card de imagem com overlay — link direto para a tela de treino */}
      <Link
        href="/treino"
        className="overflow-hidden rounded-2xl border border-white/10 bg-[#111827]"
      >
        <div className="relative h-56">

          <Image
            src="/imagens/perfil/cardTreino.png"
            alt="Treino"
            fill
            className="object-cover"
          />

          {/* Overlay escurecido para legibilidade do texto sobre a imagem */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/80" />

          <div className="absolute inset-0 flex flex-col justify-between p-6">

            <div>
              <div className="inline-flex rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em]">
                Próximo treino
              </div>

              <h2 className="mt-4 text-4xl font-black italic">
                TREINO B
              </h2>

              <p className="text-blue-300">
                Costas e Bíceps
              </p>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold hover:bg-blue-500 transition">
              Iniciar treino
              <ChevronRight size={16} />
            </div>

          </div>
        </div>
      </Link>

      {/* ── ÚLTIMO TREINO ── */}
      {/* Lista os 3 primeiros exercícios do último treino registrado */}
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Último treino</h3>
            <p className="text-xs text-white/40 mt-0.5">
              {dashboardData?.ultimoTreino?.dataTreino
                ? formatDateTime(dashboardData.ultimoTreino.dataTreino)
                : "Nenhum treino"}
            </p>
          </div>

          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <Dumbbell size={16} />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {/* slice(0, 3): mostra no máximo 3 exercícios para não sobrecarregar o card */}
          {(dashboardData?.ultimoTreino?.exercicios ?? [])
            .slice(0, 3)
            .map((ex) => (
              <div
                key={ex.nome}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900 p-4"
              >
                <div>
                  <p className="text-sm font-semibold">{ex.nome}</p>
                  <p className="text-xs text-white/40">{ex.series} séries</p>
                </div>

                <div className="text-sm font-bold text-emerald-400">
                  {ex.volumeKg.toFixed(0)} kg
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ── GRÁFICO DE FREQUÊNCIA ── */}
      {/* Barras normalizadas pelo valor máximo da semana para comparação visual */}
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">

        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Frequência semanal</h3>
            <p className="text-xs text-white/40 mt-0.5">Quantidade de treinos por dia</p>
          </div>

          <div className="text-xs text-white/40">
            <Timer size={14} className="inline" />{" "}
            {formatDuration(dashboardData?.resumo.totalDuracaoSegundos ?? 0)}
          </div>
        </div>

        <div className="grid h-40 grid-cols-7 items-end gap-3">
          {weekData.map((day) => (
            <div
              key={day.date}
              className="flex h-full flex-col items-center justify-end gap-2"
            >
              {/* Barra azul se houve treino, cinza se não houve.
                  Altura mínima de 10% para que dias sem treino ainda apareçam visualmente. */}
              <div
                className={`w-full rounded-xl ${day.treinos > 0 ? "bg-blue-500" : "bg-white/10"}`}
                style={{ height: `${Math.max((day.treinos / maxWeek) * 100, 10)}%` }}
              />
              <span className="text-[10px] text-white/40">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Export principal ─────────────────────────────────────────────────────────

/**
 * DashboardPage envolve o conteúdo com RotaProtegida.
 *
 * RotaProtegida aguarda o AuthProvider terminar de verificar o cookie
 * (estado `carregando`) antes de decidir redirecionar ou renderizar.
 * Isso evita o flash de redirecionamento para o login logo após o login bem-sucedido.
 */
export default function DashboardPage() {
  return (
    <RotaProtegida>
      <DashboardContent />
    </RotaProtegida>
  );
}