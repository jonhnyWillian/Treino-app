"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Search, Plus, Eye, Pencil, Check, X, CreditCard, ChevronDown, ChevronUp, ChevronsUpDown, Trash2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import RotaProtegida from "@/components/ui/RotaProtegida";
import { listarClientes, ClienteLista } from "@/services/api";

//  Tipos 

type Status = "pendente" | "pago" | "atrasado";
type OrdemCol = "nomeCliente" | "valor" | "vencimento" | "status";

type Mensalidade = {
  id: number;
  usuarioId: number;
  nomeCliente: string;
  emailCliente: string;
  valor: number;
  vencimento: string;
  status: Status;
  dataPagamento?: string | null;
  observacao?: string | null;
  criadoEm: string;
};

type MensalidadeForm = {
  usuarioId: string;
  valor: string;
  vencimento: string;
  observacao: string;
};

const formVazio: MensalidadeForm = { usuarioId: "", valor: "", vencimento: "", observacao: "" };

//  Utilitários 

function formatarData(data?: string | null): string {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarValor(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diasAtraso(vencimento: string): number {
  const v = new Date(vencimento + "T12:00:00");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return Math.floor((hoje.getTime() - v.getTime()) / 86400000);
}

function coresStatus(status: Status) {
  switch (status) {
    case "pago": return { badge: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20", dot: "bg-emerald-400" };
    case "pendente": return { badge: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20", dot: "bg-amber-400" };
    case "atrasado": return { badge: "bg-red-500/10 text-red-400 ring-1 ring-red-500/20", dot: "bg-red-400" };
  }
}

//  API 

const API = process.env.NEXT_PUBLIC_API_URL;

async function fetchMensalidades(): Promise<Mensalidade[]> {
  const res = await fetch(`${API}/admin/mensalidades`, {
    credentials: "include",
  });

  if (!res.ok)
    throw new Error("Erro");

  const data = await res.json();

  return data.map((m: Mensalidade) => ({
    ...m,
    valor: Number(m.valor),
  }));
}

async function criarMensalidade(form: MensalidadeForm): Promise<void> {
  const res = await fetch(`${API}/admin/mensalidades`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      usuarioId: Number(form.usuarioId),
      valor: parseFloat(form.valor.replace(",", ".")),
      vencimento: form.vencimento,
      observacao: form.observacao || null,
    }),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Erro ao criar"); }
}

async function editarMensalidadeAPI(id: number, body: object): Promise<void> {
  const res = await fetch(`${API}/admin/mensalidades/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.message || "Erro ao editar"); }
}

async function excluirMensalidadeAPI(id: number): Promise<void> {
  const res = await fetch(`${API}/admin/mensalidades/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Erro ao excluir");
}

//  ClienteSearch 

function ClienteSearch({ clientes, value, onChange, disabled }: {
  clientes: ClienteLista[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selecionado = clientes.find((c) => String(c.id) === value);
  const filtrados = clientes.filter((c) =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.email.toLowerCase().includes(busca.toLowerCase())
  );

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setAberto(false);
        setBusca("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (aberto) setTimeout(() => inputRef.current?.focus(), 50);
  }, [aberto]);

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setAberto((v) => !v)}
        className="h-11 w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-left transition hover:border-white/20 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selecionado ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-6 w-6 shrink-0 flex items-center justify-center rounded-md bg-emerald-500/15 text-[10px] font-bold text-emerald-400">
              {selecionado.nome.charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-white text-sm">{selecionado.nome}</span>
            <span className="text-white/30 text-xs truncate hidden sm:block">— {selecionado.email}</span>
          </div>
        ) : (
          <span className="text-white/30">Selecione ou busque um cliente...</span>
        )}
        <ChevronDown size={13} className={`text-white/30 shrink-0 ml-2 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {aberto && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-white/10 bg-[#0d1424] shadow-2xl overflow-hidden">
          {/* Busca */}
          <div className="p-2 border-b border-white/5">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                ref={inputRef}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="h-9 w-full rounded-lg bg-white/5 pl-8 pr-3 text-sm text-white placeholder:text-white/25 outline-none focus:bg-white/8 transition"
              />
            </div>
          </div>

          {/* Contagem */}
          <div className="px-4 py-2 border-b border-white/5">
            <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">
              {filtrados.length} cliente{filtrados.length !== 1 ? "s" : ""}
              {busca && ` para "${busca}"`}
            </p>
          </div>

          {/* Lista */}
          <div className="max-h-56 overflow-y-auto">
            {filtrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <p className="text-sm text-white/30">Nenhum cliente encontrado.</p>
                {busca && (
                  <button onClick={() => setBusca("")} className="text-xs text-blue-400 hover:text-blue-300 transition">
                    Limpar busca
                  </button>
                )}
              </div>
            ) : (
              filtrados.map((c) => {
                const selecionadoAtual = String(c.id) === value;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { onChange(String(c.id)); setAberto(false); setBusca(""); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-b border-white/[0.03] last:border-0 ${selecionadoAtual
                        ? "bg-emerald-500/8 hover:bg-emerald-500/12"
                        : "hover:bg-white/5"
                      }`}
                  >
                    {/* Avatar */}
                    <div className={`h-8 w-8 shrink-0 flex items-center justify-center rounded-lg text-xs font-bold ${selecionadoAtual
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-white/8 text-white/40"
                      }`}>
                      {c.nome.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${selecionadoAtual ? "text-emerald-400" : "text-white"}`}>
                        {c.nome}
                      </p>
                      <p className="text-[11px] text-white/30 truncate">{c.email}</p>
                    </div>

                    {/* Check */}
                    {selecionadoAtual && (
                      <div className="shrink-0 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Rodapé quando há muitos clientes */}
          {clientes.length > 8 && filtrados.length > 0 && !busca && (
            <div className="px-4 py-2 border-t border-white/5 bg-white/[0.02]">
              <p className="text-[10px] text-white/20 text-center">Digite para filtrar a lista</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modal de confirmação ─────────────────────────────────────────────────────

interface ConfirmModalProps {
  titulo: string;
  descricao: string;
  confirmLabel: string;
  confirmCor: string;
  icone: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  carregando?: boolean;
}

function ConfirmModal({ titulo, descricao, confirmLabel, confirmCor, icone, onConfirm, onCancel, carregando }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#0f172a] border border-white/10 shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          {icone}
          <h3 className="text-base font-bold text-white">{titulo}</h3>
        </div>
        <p className="text-sm text-white/50">{descricao}</p>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="flex-1 h-10 rounded-xl bg-white/5 text-sm font-semibold text-white/60 hover:bg-white/10 transition">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={carregando}
            className={`flex-1 h-10 rounded-xl text-sm font-bold text-white transition disabled:opacity-60 flex items-center justify-center gap-2 ${confirmCor}`}>
            {carregando
              ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
              : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Ícone de ordenação ───────────────────────────────────────────────────────

function SortIcon({ col, ordem, dir }: { col: OrdemCol; ordem: OrdemCol; dir: "asc" | "desc" }) {
  if (ordem !== col) return <ChevronsUpDown size={12} className="text-white/20" />;
  return dir === "asc" ? <ChevronUp size={12} className="text-emerald-400" /> : <ChevronDown size={12} className="text-emerald-400" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function MensalidadeContent() {
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [clientes, setClientes] = useState<ClienteLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<Status | "">("");
  const [filtroMes, setFiltroMes] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Mensalidade | null>(null);
  const [form, setForm] = useState<MensalidadeForm>(formVazio);
  const [salvando, setSalvando] = useState(false);
  const [detalhes, setDetalhes] = useState<Mensalidade | null>(null);
  const [ordemCol, setOrdemCol] = useState<OrdemCol>("vencimento");
  const [ordemDir, setOrdemDir] = useState<"asc" | "desc">("asc");
  const [confirmPagar, setConfirmPagar] = useState<Mensalidade | null>(null);
  const [confirmExcluir, setConfirmExcluir] = useState<Mensalidade | null>(null);
  const [processando, setProcessando] = useState(false);

  const fetchTudo = useCallback(async () => {
    try {
      const [mens, clts] = await Promise.all([fetchMensalidades(), listarClientes()]);
      setMensalidades(mens);
      setClientes(clts.filter((c) => c.situacao !== "desativado"));
    } catch {
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTudo(); }, [fetchTudo]);

  const toggleOrdem = (col: OrdemCol) => {
    if (ordemCol === col) setOrdemDir((d) => d === "asc" ? "desc" : "asc");
    else { setOrdemCol(col); setOrdemDir("asc"); }
  };

  const filtradas = [...mensalidades]
    .filter((m) => busca
      ? m.nomeCliente.toLowerCase().includes(busca.toLowerCase()) || m.emailCliente.toLowerCase().includes(busca.toLowerCase())
      : true)
    .filter((m) => filtroStatus ? m.status === filtroStatus : true)
    .filter((m) => filtroMes ? m.vencimento.startsWith(filtroMes) : true)
    .sort((a, b) => {
      const va = ordemCol === "valor" ? a.valor : (a[ordemCol] ?? "");
      const vb = ordemCol === "valor" ? b.valor : (b[ordemCol] ?? "");
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return ordemDir === "asc" ? cmp : -cmp;
    });

  const totalGeral = mensalidades.reduce((a, m) => a + m.valor, 0);
  const totalPago = mensalidades.filter((m) => m.status === "pago").reduce((a, m) => a + m.valor, 0);
  const totalPendente = mensalidades.filter((m) => m.status === "pendente").reduce((a, m) => a + m.valor, 0);
  const totalAtrasado = mensalidades.filter((m) => m.status === "atrasado").reduce((a, m) => a + m.valor, 0);

  const handleField = (field: keyof MensalidadeForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleAbrirCriacao = () => { setEditando(null); setForm(formVazio); setShowModal(true); };

  const handleAbrirEdicao = (m: Mensalidade) => {
    setEditando(m);
    setForm({ usuarioId: String(m.usuarioId), valor: String(m.valor), vencimento: m.vencimento.split("T")[0], observacao: m.observacao ?? "" });
    setShowModal(true);
  };

  const fecharModal = () => { setShowModal(false); setForm(formVazio); setEditando(null); };

  const handleSalvar = async () => {
    if (!form.usuarioId) { toast.error("Selecione um cliente."); return; }
    if (!form.valor || isNaN(parseFloat(form.valor.replace(",", ".")))) { toast.error("Informe um valor válido."); return; }
    if (!form.vencimento) { toast.error("Informe a data de vencimento."); return; }

    setSalvando(true);
    try {
      if (editando) {
        await editarMensalidadeAPI(editando.id, {
          valor: parseFloat(form.valor.replace(",", ".")),
          vencimento: form.vencimento,
          observacao: form.observacao || null,
        });
        toast.success("Mensalidade atualizada!");
      } else {
        await criarMensalidade(form);
        toast.success("Mensalidade criada!");
      }
      fecharModal();
      await fetchTudo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const handleConfirmarPagamento = async () => {
    if (!confirmPagar) return;
    setProcessando(true);
    try {
      const hoje = new Date().toISOString().split("T")[0];
      await editarMensalidadeAPI(confirmPagar.id, { status: "pago", dataPagamento: hoje });
      toast.success("Pagamento registrado!");
      setConfirmPagar(null);
      await fetchTudo();
    } catch {
      toast.error("Erro ao registrar pagamento.");
    } finally {
      setProcessando(false);
    }
  };

  const handleConfirmarExclusao = async () => {
    if (!confirmExcluir) return;
    setProcessando(true);
    try {
      await excluirMensalidadeAPI(confirmExcluir.id);
      toast.success("Mensalidade excluída.");
      setConfirmExcluir(null);
      await fetchTudo();
    } catch {
      toast.error("Erro ao excluir.");
    } finally {
      setProcessando(false);
    }
  };

  const mesesDisponiveis = Array.from(
    new Set(mensalidades.map((m) => m.vencimento.split("T")[0].substring(0, 7)))
  ).sort((a, b) => b.localeCompare(a));

  const inputCls = "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition";
  const labelCls = "text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30";

  return (
    <div className="text-white flex flex-col gap-4">

      {/* ── HEADER ── */}
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold leading-tight">Mensalidades</h1>
            <p className="text-xs text-white/40 mt-0.5">
              {loading ? "Carregando..." : `${mensalidades.length} registro${mensalidades.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as Status | "")}
                className="h-9 appearance-none rounded-xl border border-white/10 bg-white/5 pl-3 pr-8 text-sm text-white outline-none focus:border-blue-500 transition">
                <option value="">Todos os status</option>
                <option value="pago">Pago</option>
                <option value="pendente">Pendente</option>
                <option value="atrasado">Atrasado</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={filtroMes} onChange={(e) => setFiltroMes(e.target.value)}
                className="h-9 appearance-none rounded-xl border border-white/10 bg-white/5 pl-3 pr-8 text-sm text-white outline-none focus:border-blue-500 transition">
                <option value="">Todos os meses</option>
                {mesesDisponiveis.map((m) => {
                  const [ano, mes] = m.split("-");
                  const nome = new Date(Number(ano), Number(mes) - 1).toLocaleString("pt-BR", { month: "long", year: "numeric" });
                  return <option key={m} value={m}>{nome.charAt(0).toUpperCase() + nome.slice(1)}</option>;
                })}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente..."
                className="h-9 w-52 rounded-xl border border-white/10 bg-white/5 pl-9 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition" />
            </div>
            <button onClick={handleAbrirCriacao}
              className="flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500 transition shrink-0">
              <Plus size={15} />Nova mensalidade
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total / período", value: formatarValor(totalGeral), cor: "text-white" },
          { label: "Recebido", value: formatarValor(totalPago), cor: "text-emerald-400" },
          { label: "Pendente", value: formatarValor(totalPendente), cor: "text-amber-400" },
          { label: "Atrasado", value: formatarValor(totalAtrasado), cor: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-[#111827] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">{s.label}</p>
            <p className={`mt-2 text-xl font-black ${s.cor}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── TABELA ── */}
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold">Registros</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {busca || filtroStatus || filtroMes
              ? `${filtradas.length} resultado${filtradas.length !== 1 ? "s" : ""} encontrado${filtradas.length !== 1 ? "s" : ""}`
              : "Todos os registros"}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="text-white/40 text-sm">Carregando mensalidades...</p>
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
              <CreditCard size={24} className="text-white/20" />
            </div>
            <p className="text-white/30 text-sm">
              {busca || filtroStatus || filtroMes ? "Nenhuma mensalidade encontrada." : "Nenhuma mensalidade cadastrada ainda."}
            </p>
            {!busca && !filtroStatus && !filtroMes && (
              <button onClick={handleAbrirCriacao}
                className="mt-1 flex items-center gap-2 rounded-xl bg-emerald-600/20 border border-emerald-500/20 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-600/30 transition">
                <Plus size={14} />Criar primeira mensalidade
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-[1.4fr_90px_110px_100px_110px_120px] gap-3 px-4 pb-2 border-b border-white/5">
              {([
                { key: "nomeCliente", label: "Cliente" },
                { key: "valor", label: "Valor" },
                { key: "vencimento", label: "Vencimento" },
                { key: null, label: "Pagamento" },
                { key: "status", label: "Status" },
                { key: null, label: "Ações" },
              ] as { key: OrdemCol | null; label: string }[]).map(({ key, label }) =>
                key ? (
                  <button key={label} onClick={() => toggleOrdem(key)}
                    className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30 hover:text-white/60 transition text-left">
                    {label}<SortIcon col={key} ordem={ordemCol} dir={ordemDir} />
                  </button>
                ) : (
                  <span key={label} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">{label}</span>
                )
              )}
            </div>

            {filtradas.map((m) => {
              const cores = coresStatus(m.status);
              const atraso = m.status === "atrasado" ? diasAtraso(m.vencimento) : 0;
              return (
                <div key={m.id}
                  className="group grid grid-cols-[1.4fr_90px_110px_100px_110px_120px] gap-3 items-center rounded-xl px-4 py-3 hover:bg-white/5 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${m.status === "pago" ? "bg-emerald-500/10 text-emerald-400"
                        : m.status === "atrasado" ? "bg-red-500/10 text-red-400"
                          : "bg-amber-500/10 text-amber-400"}`}>
                      {m.nomeCliente.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{m.nomeCliente}</p>
                      <p className="text-[10px] text-white/30 truncate">{m.emailCliente}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-white">{formatarValor(m.valor)}</span>
                  <div>
                    <span className={`text-sm ${m.status === "atrasado" ? "text-red-400 font-medium" : "text-white/50"}`}>
                      {formatarData(m.vencimento)}
                    </span>
                    {atraso > 0 && <p className="text-[10px] text-red-400/70">{atraso}d em atraso</p>}
                  </div>
                  <span className="text-sm text-white/50">{formatarData(m.dataPagamento)}</span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${cores.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${cores.dot}`} />
                    {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setDetalhes(m)} title="Ver detalhes"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition">
                      <Eye size={14} />
                    </button>
                    {m.status !== "pago" && (
                      <button onClick={() => setConfirmPagar(m)} title="Registrar pagamento"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition">
                        <Check size={14} />
                      </button>
                    )}
                    {m.status !== "pago" && (
                      <button onClick={() => handleAbrirEdicao(m)} title="Editar"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition">
                        <Pencil size={14} />
                      </button>
                    )}
                    <button onClick={() => setConfirmExcluir(m)} title="Excluir"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL: Criar / Editar ── */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#0f172a] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold">{editando ? "Editar mensalidade" : "Nova mensalidade"}</h3>
                  <p className="text-xs text-white/40">
                    {editando ? `Editando: ${editando.nomeCliente}` : `${clientes.length} clientes disponíveis`}
                  </p>
                </div>
              </div>
              <button onClick={fecharModal}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Cliente */}
              <div className="space-y-1.5">
                <label className={labelCls}>
                  Cliente *{" "}
                  {!editando && clientes.length > 0 && (
                    <span className="normal-case tracking-normal font-normal text-white/20">
                      ({clientes.length} ativo{clientes.length !== 1 ? "s" : ""})
                    </span>
                  )}
                </label>
                <ClienteSearch
                  clientes={clientes}
                  value={form.usuarioId}
                  onChange={(id) => handleField("usuarioId", id)}
                  disabled={!!editando}
                />
                {editando && <p className="text-[10px] text-white/25">O cliente não pode ser alterado após a criação.</p>}
                {!editando && clientes.length === 0 && !loading && (
                  <p className="text-[10px] text-amber-400/70">Nenhum cliente ativo encontrado. Cadastre um cliente primeiro.</p>
                )}
              </div>

              {/* Valor + Vencimento */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelCls}>Valor (R$) *</label>
                  <input value={form.valor} onChange={(e) => handleField("valor", e.target.value)}
                    inputMode="decimal" placeholder="150,00" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Vencimento *</label>
                  <input type="date" value={form.vencimento} onChange={(e) => handleField("vencimento", e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Observação */}
              <div className="space-y-1.5">
                <label className={labelCls}>Observação</label>
                <textarea value={form.observacao} onChange={(e) => handleField("observacao", e.target.value)}
                  rows={2} placeholder="Ex: plano trimestral, desconto aplicado..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition resize-none" />
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button onClick={fecharModal}
                className="flex-1 h-11 rounded-xl bg-white/5 text-sm font-semibold text-white/70 hover:bg-white/10 transition">
                Cancelar
              </button>
              <button onClick={handleSalvar} disabled={salvando}
                className="flex-1 h-11 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-500 transition disabled:opacity-60 flex items-center justify-center gap-2">
                {salvando
                  ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                  : editando ? "Salvar alterações" : "Criar mensalidade"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Detalhes ── */}
      {detalhes && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0f172a] border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black ${coresStatus(detalhes.status).badge}`}>
                  {detalhes.nomeCliente.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold">{detalhes.nomeCliente}</h3>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase ${coresStatus(detalhes.status).badge} rounded-full px-2 py-0.5`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${coresStatus(detalhes.status).dot}`} />
                    {detalhes.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setDetalhes(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white transition">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-0">
              {[
                { label: "ID", value: `#${detalhes.id}` },
                { label: "Email", value: detalhes.emailCliente },
                { label: "Valor", value: formatarValor(detalhes.valor) },
                { label: "Vencimento", value: formatarData(detalhes.vencimento) },
                { label: "Pagamento", value: formatarData(detalhes.dataPagamento) },
                { label: "Criado em", value: formatarData(detalhes.criadoEm) },
                { label: "Observação", value: detalhes.observacao || "—" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between py-2.5 border-b border-white/5 last:border-0 gap-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30 shrink-0">{item.label}</span>
                  <span className="text-sm text-white/80 font-medium text-right">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3 p-6 pt-0">
              {detalhes.status !== "pago" && (
                <button onClick={() => { setDetalhes(null); setConfirmPagar(detalhes); }}
                  className="flex-1 h-10 rounded-xl bg-emerald-500/10 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition flex items-center justify-center gap-2">
                  <Check size={14} />Registrar pagamento
                </button>
              )}
              {detalhes.status !== "pago" && (
                <button onClick={() => { setDetalhes(null); handleAbrirEdicao(detalhes); }}
                  className="flex-1 h-10 rounded-xl bg-amber-500/10 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition flex items-center justify-center gap-2">
                  <Pencil size={14} />Editar
                </button>
              )}
              <button onClick={() => setDetalhes(null)}
                className="flex-1 h-10 rounded-xl bg-white/5 text-sm font-semibold text-white/60 hover:bg-white/10 transition">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM: Pagamento ── */}
      {confirmPagar && (
        <ConfirmModal
          titulo="Registrar pagamento"
          descricao={`Confirmar pagamento de ${formatarValor(confirmPagar.valor)} de "${confirmPagar.nomeCliente}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Confirmar pagamento"
          confirmCor="bg-emerald-600 hover:bg-emerald-500"
          icone={<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10"><Check size={18} className="text-emerald-400" /></div>}
          onConfirm={handleConfirmarPagamento}
          onCancel={() => setConfirmPagar(null)}
          carregando={processando}
        />
      )}

      {/* ── CONFIRM: Excluir ── */}
      {confirmExcluir && (
        <ConfirmModal
          titulo="Excluir mensalidade"
          descricao={`Tem certeza que deseja excluir a mensalidade de "${confirmExcluir.nomeCliente}" no valor de ${formatarValor(confirmExcluir.valor)}? Esta ação é irreversível.`}
          confirmLabel="Excluir"
          confirmCor="bg-red-600 hover:bg-red-500"
          icone={<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10"><AlertCircle size={18} className="text-red-400" /></div>}
          onConfirm={handleConfirmarExclusao}
          onCancel={() => setConfirmExcluir(null)}
          carregando={processando}
        />
      )}
    </div>
  );
}

export default function MensalidadePage() {
  return (
    <RotaProtegida role="admin">
      <MensalidadeContent />
    </RotaProtegida>
  );
}