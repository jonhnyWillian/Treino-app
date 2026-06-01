"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { listarClientes } from "@/services/api";
import RotaProtegida from "@/components/ui/RotaProtegida";
import {
  Users, TrendingUp, AlertTriangle, CheckCircle,
  Clock, CreditCard, Activity, ChevronRight,
  UserCheck, UserX, Calendar, Flame, Dumbbell,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ClienteLista {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  idade?: number;
  sexo?: string;
  situacao?: string;
  dataCriacao?: string;
}

interface Mensalidade {
  id: number;
  usuarioId: number;
  nomeCliente: string;
  emailCliente: string;
  valor: number;
  vencimento: string;
  status: "pendente" | "pago" | "atrasado";
}

interface AlertasResumo {
  aniversarios: number;
  mensalidadesCriticas: number;
  semTreinar: number;
}

interface ResumoAdmin {
  totalAtivos: number;
  totalInativos: number;
  totalClientes: number;
  recemCadastrados: ClienteLista[];
  totalRecebidoMes: number;
  totalAtrasado: number;
  totalPendente: number;
  inadimplentes: Mensalidade[];
  alertas: AlertasResumo;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CARD_CLS = "rounded-2xl border border-white/8 bg-[#0d1424] p-5";
const LABEL_CLS = "text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30";
const API = process.env.NEXT_PUBLIC_API_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function getInitials(nome: string): string {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function fmt(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchMensalidades(): Promise<Mensalidade[]> {
  const res = await fetch(`${API}/admin/mensalidades`, {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Erro");

  const data = await res.json();

  return data.map((m: Mensalidade) => ({
    ...m,
    valor: Number(m.valor),
  }));
}

async function fetchAlertas(): Promise<AlertasResumo> {
  try {
    const res = await fetch(`${API}/admin/alertas`, { credentials: "include" });
    if (!res.ok) return { aniversarios: 0, mensalidadesCriticas: 0, semTreinar: 0 };
    const data = await res.json();
    return {
      aniversarios: data.aniversarios?.length ?? 0,
      mensalidadesCriticas: data.mensalidadesCriticas?.length ?? 0,
      semTreinar: data.semTreinar?.length ?? 0,
    };
  } catch {
    return { aniversarios: 0, mensalidadesCriticas: 0, semTreinar: 0 };
  }
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number | string;
  subLabel: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend?: string;
  trendUp?: boolean;
  href?: string;
}

function MetricCard({ label, value, subLabel, icon: Icon, color, bgColor, trend, trendUp, href }: MetricCardProps) {
  const content = (
    <div className={`${CARD_CLS} ${href ? "hover:border-white/15 transition cursor-pointer" : ""}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={LABEL_CLS}>{label}</p>
          <p className={`mt-2 text-4xl font-black tracking-tight ${color}`}>{value}</p>
          <p className="mt-1 text-xs text-white/30">{subLabel}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgColor}`}>
          <Icon size={18} className={color} />
        </div>
      </div>
      {trend && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${trendUp ? "text-emerald-400" : "text-red-400"}`}>
          <TrendingUp size={12} className={trendUp ? "" : "rotate-180"} />
          {trend}
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

// ─── ClienteRow ───────────────────────────────────────────────────────────────

function ClienteRow({ cliente }: { cliente: ClienteLista }) {
  const ativo = cliente.situacao !== "desativado";
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
        ativo ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/30"
      }`}>
        {getInitials(cliente.nome)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate">{cliente.nome}</p>
        <p className="text-[11px] text-white/30 truncate">{cliente.email}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          ativo ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
        }`}>
          {ativo ? "Ativo" : "Inativo"}
        </span>
        <Link href="/admin/cliente"
          className="flex h-7 items-center gap-1 rounded-lg border border-white/10 px-2.5 text-[11px] font-medium text-white/50 hover:border-white/20 hover:text-white transition">
          Ver <ChevronRight size={11} />
        </Link>
      </div>
    </div>
  );
}

// ─── MensalidadeRow ───────────────────────────────────────────────────────────

function MensalidadeRow({ m }: { m: Mensalidade }) {
  const atrasado = m.status === "atrasado";
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
        atrasado ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
      }`}>
        {getInitials(m.nomeCliente)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate">{m.nomeCliente}</p>
        <p className="text-[11px] text-white/30 truncate">{m.emailCliente}</p>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className={`text-sm font-bold ${atrasado ? "text-red-400" : "text-amber-400"}`}>
          {fmt(m.valor)}
        </span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
          atrasado ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
        }`}>
          {atrasado ? "Atrasado" : "Pendente"}
        </span>
      </div>
    </div>
  );
}

// ─── Conteúdo principal ───────────────────────────────────────────────────────

function AdminDashboardContent() {
  const { usuario } = useAuth();
  const [resumo, setResumo] = useState<ResumoAdmin | null>(null);
  const [loading, setLoading] = useState(true);
  const [greeting] = useState(getGreeting);

  useEffect(() => {
    Promise.all([listarClientes(), fetchMensalidades(), fetchAlertas()])
      .then(([clientes, mensalidades, alertas]) => {
        const ativos   = clientes.filter((c) => c.situacao !== "desativado");
        const inativos = clientes.filter((c) => c.situacao === "desativado");
        const recentes = [...clientes].slice(0, 5);

        // Mês atual
        const mesAtual = new Date().toISOString().substring(0, 7);
        const mensMes  = mensalidades.filter((m) => m.vencimento?.substring(0, 7) === mesAtual);

        const totalRecebidoMes = mensMes
          .filter((m) => m.status === "pago")
          .reduce((a, m) => a + m.valor, 0);

        const totalAtrasado = mensalidades
          .filter((m) => m.status === "atrasado")
          .reduce((a, m) => a + m.valor, 0);

        const totalPendente = mensalidades
          .filter((m) => m.status === "pendente")
          .reduce((a, m) => a + m.valor, 0);

        const inadimplentes = mensalidades
          .filter((m) => m.status === "atrasado" || m.status === "pendente")
          .slice(0, 4);

        setResumo({
          totalAtivos: ativos.length,
          totalInativos: inativos.length,
          totalClientes: clientes.length,
          recemCadastrados: recentes,
          totalRecebidoMes,
          totalAtrasado,
          totalPendente,
          inadimplentes,
          alertas,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="text-white space-y-4">

      {/* ── HEADER ── */}
      <div className={CARD_CLS}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame size={14} className="text-emerald-400" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Painel Administrativo
              </p>
            </div>
            <h1 className="text-2xl font-black leading-tight">
              {greeting},{" "}
              <span className="text-emerald-400">{usuario?.nome?.split(" ")[0]}</span>
            </h1>
            <p className="mt-1 text-sm text-white/30">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/cliente"
              className="flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold hover:bg-emerald-500 transition">
              <Users size={15} />Gerenciar clientes
            </Link>
            <Link href="/admin/mensalidade"
              className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white/60 hover:bg-white/10 transition">
              <CreditCard size={15} />Mensalidades
            </Link>
          </div>
        </div>
      </div>

      {/* ── MÉTRICAS CLIENTES ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Total de clientes" value={resumo?.totalClientes ?? 0}
          subLabel="cadastrados" icon={Users} color="text-blue-400" bgColor="bg-blue-500/10"
          href="/admin/cliente"
        />
        <MetricCard
          label="Clientes ativos" value={resumo?.totalAtivos ?? 0}
          subLabel="com acesso" icon={UserCheck} color="text-emerald-400" bgColor="bg-emerald-500/10"
          href="/admin/cliente"
        />
        <MetricCard
          label="Mensalidades atrasadas"
          value={resumo?.inadimplentes.filter(m => m.status === "atrasado").length ?? 0}
          subLabel={fmt(resumo?.totalAtrasado ?? 0)}
          icon={AlertTriangle} color="text-red-400" bgColor="bg-red-500/10"
          href="/admin/mensalidade"
        />
        <MetricCard
          label="Desativados" value={resumo?.totalInativos ?? 0}
          subLabel="contas inativas" icon={UserX} color="text-white/50" bgColor="bg-white/5"
          href="/admin/cliente"
        />
      </div>

      {/* ── MÉTRICAS FINANCEIRAS ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={CARD_CLS}>
          <p className={LABEL_CLS}>Recebido este mês</p>
          <p className="mt-2 text-2xl font-black text-emerald-400">{fmt(resumo?.totalRecebidoMes ?? 0)}</p>
          <p className="mt-1 text-xs text-white/30">pagamentos confirmados</p>
        </div>
        <div className={CARD_CLS}>
          <p className={LABEL_CLS}>Pendente</p>
          <p className="mt-2 text-2xl font-black text-amber-400">{fmt(resumo?.totalPendente ?? 0)}</p>
          <p className="mt-1 text-xs text-white/30">aguardando pagamento</p>
        </div>
        <div className={CARD_CLS}>
          <p className={LABEL_CLS}>Em atraso</p>
          <p className="mt-2 text-2xl font-black text-red-400">{fmt(resumo?.totalAtrasado ?? 0)}</p>
          <p className="mt-1 text-xs text-white/30">vencidas não pagas</p>
        </div>
      </div>

      {/* ── LINHA PRINCIPAL ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Clientes recentes */}
        <div className={`${CARD_CLS} lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold">Clientes cadastrados</h2>
              <p className="text-xs text-white/30 mt-0.5">Últimos {resumo?.recemCadastrados.length ?? 0} clientes</p>
            </div>
            <Link href="/admin/cliente"
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition font-medium">
              Ver todos <ChevronRight size={13} />
            </Link>
          </div>
          {resumo?.recemCadastrados.length === 0 ? (
            <div className="py-8 text-center text-sm text-white/20">Nenhum cliente cadastrado ainda.</div>
          ) : (
            resumo?.recemCadastrados.map((c) => <ClienteRow key={c.id} cliente={c} />)
          )}
        </div>

        {/* Coluna lateral */}
        <div className="flex flex-col gap-4">

          {/* Alertas rápidos — dados reais */}
          <div className={CARD_CLS}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle size={14} className="text-amber-400" />
                </div>
                <h2 className="text-sm font-bold">Alertas</h2>
              </div>
              <Link href="/admin/alertas"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 transition font-medium flex items-center gap-0.5">
                Ver todos <ChevronRight size={11} />
              </Link>
            </div>

            <div className="space-y-2">
              <Link href="/admin/alertas"
                className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/5 p-3 hover:bg-white/6 transition">
                <Calendar size={14} className="text-pink-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">Aniversariantes</p>
                  <p className="text-[11px] text-white/30">próximos 7 dias</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  (resumo?.alertas.aniversarios ?? 0) > 0
                    ? "bg-pink-500/20 text-pink-400"
                    : "bg-white/5 text-white/25"
                }`}>
                  {resumo?.alertas.aniversarios ?? 0}
                </span>
              </Link>

              <Link href="/admin/mensalidade"
                className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/5 p-3 hover:bg-white/6 transition">
                <CreditCard size={14} className="text-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">Mensalidades críticas</p>
                  <p className="text-[11px] text-white/30">atrasadas ou vencendo</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  (resumo?.alertas.mensalidadesCriticas ?? 0) > 0
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-white/5 text-white/25"
                }`}>
                  {resumo?.alertas.mensalidadesCriticas ?? 0}
                </span>
              </Link>

              <Link href="/admin/alertas"
                className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/5 p-3 hover:bg-white/6 transition">
                <Dumbbell size={14} className="text-red-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">Sem treinar</p>
                  <p className="text-[11px] text-white/30">mais de 7 dias</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  (resumo?.alertas.semTreinar ?? 0) > 0
                    ? "bg-red-500/20 text-red-400"
                    : "bg-white/5 text-white/25"
                }`}>
                  {resumo?.alertas.semTreinar ?? 0}
                </span>
              </Link>

              <Link href="/admin/cliente"
                className="flex items-center gap-3 rounded-xl bg-white/4 border border-white/5 p-3 hover:bg-white/6 transition">
                <Activity size={14} className="text-white/30 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">Contas desativadas</p>
                  <p className="text-[11px] text-white/30">clientes inativos</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  (resumo?.totalInativos ?? 0) > 0
                    ? "bg-white/10 text-white/50"
                    : "bg-white/5 text-white/25"
                }`}>
                  {resumo?.totalInativos ?? 0}
                </span>
              </Link>
            </div>
          </div>

          {/* Acesso rápido */}
          <div className={CARD_CLS}>
            <h2 className="text-sm font-bold mb-3">Acesso rápido</h2>
            <div className="space-y-1">
              {[
                { label: "Novo cliente",      href: "/admin/cliente",    icon: Users,       color: "text-emerald-400" },
                { label: "Ver mensalidades",  href: "/admin/mensalidade",icon: CreditCard,  color: "text-blue-400" },
                { label: "Central de alertas",href: "/admin/alertas",    icon: Clock,       color: "text-amber-400" },
                { label: "Todos os clientes", href: "/admin/cliente",    icon: CheckCircle, color: "text-white/40" },
              ].map(({ label, href, icon: Icon, color }) => (
                <Link key={label} href={href}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/5 hover:text-white transition">
                  <Icon size={14} className={`${color} shrink-0`} />
                  {label}
                  <ChevronRight size={12} className="ml-auto opacity-0 group-hover:opacity-40 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MENSALIDADES PENDENTES/ATRASADAS ── */}
      {(resumo?.inadimplentes.length ?? 0) > 0 && (
        <div className={CARD_CLS}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold">Mensalidades pendentes / atrasadas</h2>
              <p className="text-xs text-white/30 mt-0.5">Requerem atenção imediata</p>
            </div>
            <Link href="/admin/mensalidade"
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition font-medium">
              Gerenciar <ChevronRight size={13} />
            </Link>
          </div>
          {resumo?.inadimplentes.map((m) => <MensalidadeRow key={m.id} m={m} />)}
        </div>
      )}

    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <RotaProtegida role="admin">
      <AdminDashboardContent />
    </RotaProtegida>
  );
}