"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import {  AlertTriangle, Dumbbell, CreditCard, RefreshCw, ChevronRight, X,  Clock, TrendingDown, Banknote, Check,Smartphone, ArrowLeftRight, Bell, } from "lucide-react";
import RotaProtegida from "@/components/ui/RotaProtegida";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type AlertType = "aniversario" | "mensalidade_atrasada" | "mensalidade_vencendo" | "sem_treinar";
type FormaPagamento = "pix" | "dinheiro" | "cartao" | "transferencia";

interface Alerta {
  tipo: AlertType;
  usuarioId: number;
  nome: string;
  email: string;
  fotoPerfil?: string | null;
  dataNascimento?: string;
  diasParaAniversario?: number;
  idade?: number;
  mensalidadeId?: number;
  valor?: number;
  vencimento?: string;
  diasAtraso?: number;
  diasParaVencer?: number;
  ultimoTreino?: string | null;
  diasSemTreinar?: number;
}

interface AlertasResponse {
  aniversarios: Alerta[];
  mensalidadesCriticas: Alerta[];
  semTreinar: Alerta[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function fetchAlertas(): Promise<AlertasResponse> {
  const res = await fetch(`${API_BASE}/admin/alertas`, { credentials: "include" });
  if (!res.ok) throw new Error("Erro ao buscar alertas");
  return res.json();
}

async function registrarPagamentoAPI(id: number, forma: FormaPagamento, data: string) {
  const res = await fetch(`${API_BASE}/admin/mensalidades/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ status: "pago", dataPagamento: data, formaPagamento: forma }),
  });
  if (!res.ok) throw new Error("Erro ao registrar pagamento");
}

function fmt(valor: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function fmtData(data?: string | null) {
  if (!data) return "—";
  return new Date(data + "T12:00:00").toLocaleDateString("pt-BR");
}

function getInitials(nome: string) {
  return nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ nome, foto, size = 38, cor = "bg-indigo-500/20 text-indigo-300" }: {
  nome: string; foto?: string | null; size?: number; cor?: string;
}) {
  if (foto) {
    return (
      <Image src={foto} alt={nome} width={size} height={size}
        className="rounded-xl object-cover flex-shrink-0" />
    );
  }
  return (
    <div className={`rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${cor}`}
      style={{ width: size, height: size, fontSize: size * 0.33 }}>
      {getInitials(nome)}
    </div>
  );
}

// ─── FORMAS DE PAGAMENTO ──────────────────────────────────────────────────────

const FORMAS: { value: FormaPagamento; label: string; icon: React.ReactNode }[] = [
  { value: "pix",           label: "Pix",           icon: <Smartphone size={14} /> },
  { value: "dinheiro",      label: "Dinheiro",      icon: <Banknote size={14} /> },
  { value: "cartao",        label: "Cartão",        icon: <CreditCard size={14} /> },
  { value: "transferencia", label: "Transferência", icon: <ArrowLeftRight size={14} /> },
];

// ─── MODAL DE DETALHES DE MENSALIDADE ────────────────────────────────────────

function MensalidadeModal({ alerta, onFechar, onPago }: {
  alerta: Alerta; onFechar: () => void; onPago: () => void;
}) {
  const [forma, setForma] = useState<FormaPagamento>("pix");
  const [dataPag, setDataPag] = useState(new Date().toISOString().split("T")[0]);
  const [salvando, setSalvando] = useState(false);
  const [step, setStep] = useState<"detalhes" | "pagar">("detalhes");

  const atrasado = alerta.tipo === "mensalidade_atrasada";
  const atraso   = alerta.diasAtraso ?? 0;
  const aVencer  = alerta.diasParaVencer ?? 0;

  const handlePagar = async () => {
    if (!alerta.mensalidadeId) return;
    setSalvando(true);
    try {
      await registrarPagamentoAPI(alerta.mensalidadeId, forma, dataPag);
      onPago();
      onFechar();
    } catch {
      // erro tratado no pai
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-[#0d1424] border border-white/8 shadow-2xl overflow-hidden">

        {/* Header colorido por urgência */}
        <div className={`px-5 py-4 flex items-center justify-between ${
          atrasado ? "bg-red-500/10 border-b border-red-500/20" : "bg-amber-500/10 border-b border-amber-500/20"
        }`}>
          <div className="flex items-center gap-3">
            <Avatar nome={alerta.nome} foto={alerta.fotoPerfil} size={40}
              cor={atrasado ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"} />
            <div>
              <p className="text-sm font-bold text-white">{alerta.nome}</p>
              <p className="text-[11px] text-white/40">{alerta.email}</p>
            </div>
          </div>
          <button onClick={onFechar}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/5 text-white/40 hover:text-white transition">
            <X size={14} />
          </button>
        </div>

        {step === "detalhes" ? (
          <>
            {/* Valor em destaque */}
            <div className="px-5 py-5 text-center border-b border-white/5">
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-1">Valor da mensalidade</p>
              <p className={`text-3xl font-black ${atrasado ? "text-red-400" : "text-amber-400"}`}>
                {fmt(alerta.valor ?? 0)}
              </p>
              {atrasado ? (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-red-500/15 text-red-400 text-xs font-semibold px-3 py-1 rounded-full border border-red-500/25">
                  <TrendingDown size={11} />
                  {atraso} dia{atraso !== 1 ? "s" : ""} em atraso
                </div>
              ) : (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-500/15 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full border border-amber-500/25">
                  <Clock size={11} />
                  Vence em {aVencer} dia{aVencer !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* Detalhes */}
            <div className="px-5 py-4 space-y-0">
              {[
                { label: "Vencimento", value: fmtData(alerta.vencimento) },
                { label: "ID mensalidade", value: alerta.mensalidadeId ? `#${alerta.mensalidadeId}` : "—" },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-white/30">{item.label}</span>
                  <span className="text-sm text-white/80 font-medium">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Ações */}
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={onFechar}
                className="flex-1 h-10 rounded-xl bg-white/5 text-sm font-semibold text-white/50 hover:bg-white/10 transition">
                Fechar
              </button>
              <button onClick={() => setStep("pagar")}
                className={`flex-1 h-10 rounded-xl text-sm font-bold text-white transition flex items-center justify-center gap-2 ${
                  atrasado ? "bg-red-600 hover:bg-red-500" : "bg-amber-600 hover:bg-amber-500"
                }`}>
                <Check size={14} />
                Registrar pagamento
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Step de pagamento */}
            <div className="px-5 py-5 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-3">Forma de pagamento</p>
                <div className="grid grid-cols-2 gap-2">
                  {FORMAS.map(f => (
                    <button key={f.value} onClick={() => setForma(f.value)}
                      className={`flex items-center gap-2 h-10 rounded-xl border px-3 text-sm font-medium transition ${
                        forma === f.value
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                          : "border-white/8 bg-white/5 text-white/50 hover:border-white/20"
                      }`}>
                      {f.icon}{f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold mb-1.5">Data do pagamento</p>
                <input type="date" value={dataPag} onChange={e => setDataPag(e.target.value)}
                  className="h-11 w-full rounded-xl border border-white/8 bg-white/5 px-4 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition" />
              </div>

              <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-4 py-3">
                <p className="text-xs text-emerald-400 font-medium">
                  Confirmar recebimento de <span className="font-black">{fmt(alerta.valor ?? 0)}</span> via {FORMAS.find(f => f.value === forma)?.label}
                </p>
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setStep("detalhes")}
                className="flex-1 h-10 rounded-xl bg-white/5 text-sm font-semibold text-white/50 hover:bg-white/10 transition">
                Voltar
              </button>
              <button onClick={handlePagar} disabled={salvando}
                className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-bold text-white transition disabled:opacity-60 flex items-center justify-center gap-2">
                {salvando
                  ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  : <><Check size={14} />Confirmar</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── CARD DE ANIVERSÁRIO ──────────────────────────────────────────────────────

function CardAniversario({ alerta }: { alerta: Alerta }) {
  const hoje = alerta.diasParaAniversario === 0;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition group ${
      hoje ? "bg-pink-500/8 border border-pink-500/20" : "hover:bg-white/4 border border-transparent"
    }`}>
      <Avatar nome={alerta.nome} foto={alerta.fotoPerfil} size={38} cor="bg-pink-500/15 text-pink-300" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{alerta.nome}</p>
        <p className="text-[11px] text-white/40 truncate">
          {hoje ? `🎂 Aniversário hoje — ${alerta.idade} anos!` : `Em ${alerta.diasParaAniversario} dia${alerta.diasParaAniversario !== 1 ? "s" : ""} — ${alerta.idade} anos`}
        </p>
      </div>
      {hoje && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30 shrink-0">
          Hoje 🎉
        </span>
      )}
      {!hoje && alerta.diasParaAniversario !== undefined && alerta.diasParaAniversario <= 3 && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400/70 border border-pink-500/20 shrink-0">
          Em breve
        </span>
      )}
    </div>
  );
}

// ─── CARD DE MENSALIDADE ──────────────────────────────────────────────────────

function CardMensalidade({ alerta, onClick }: { alerta: Alerta; onClick: () => void }) {
  const atrasado = alerta.tipo === "mensalidade_atrasada";
  const dias = atrasado ? alerta.diasAtraso : alerta.diasParaVencer;

  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition group text-left border ${
        atrasado
          ? "bg-red-500/5 border-red-500/15 hover:bg-red-500/10"
          : "bg-amber-500/5 border-amber-500/15 hover:bg-amber-500/10"
      }`}>
      <Avatar nome={alerta.nome} foto={alerta.fotoPerfil} size={38}
        cor={atrasado ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{alerta.nome}</p>
        <p className="text-[11px] text-white/40 truncate">
          {atrasado
            ? `Venceu em ${fmtData(alerta.vencimento)}`
            : `Vence em ${fmtData(alerta.vencimento)}`}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-sm font-black ${atrasado ? "text-red-400" : "text-amber-400"}`}>
          {fmt(alerta.valor ?? 0)}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          atrasado
            ? "bg-red-500/20 text-red-400 border-red-500/30"
            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
        }`}>
          {atrasado ? `${dias}d atraso` : `${dias}d`}
        </span>
      </div>
      <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition shrink-0" />
    </button>
  );
}

// ─── CARD SEM TREINAR ─────────────────────────────────────────────────────────

function CardSemTreinar({ alerta }: { alerta: Alerta }) {
  const critico = (alerta.diasSemTreinar ?? 0) > 14;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition ${
      critico
        ? "bg-red-500/5 border-red-500/15"
        : "bg-amber-500/5 border-amber-500/15"
    }`}>
      <Avatar nome={alerta.nome} foto={alerta.fotoPerfil} size={38}
        cor={critico ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{alerta.nome}</p>
        <p className="text-[11px] text-white/40 truncate">
          {alerta.ultimoTreino ? `Último treino: ${fmtData(alerta.ultimoTreino)}` : "Nenhum treino registrado"}
        </p>
      </div>
      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
        critico
          ? "bg-red-500/20 text-red-400 border-red-500/30"
          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
      }`}>
        {alerta.diasSemTreinar === 999 ? "Nunca" : `${alerta.diasSemTreinar}d`}
      </span>
    </div>
  );
}

// ─── SEÇÃO ────────────────────────────────────────────────────────────────────

function Secao({ titulo, icone, corIcone, corBg, qtd, vazia, children }: {
  titulo: string; icone: React.ReactNode; corIcone: string; corBg: string;
  qtd: number; vazia: string; children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(true);
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d1424] overflow-hidden">
      <button onClick={() => setAberto(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/3 transition">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${corBg}`}>
          <span className={corIcone}>{icone}</span>
        </div>
        <span className="text-sm font-bold text-white flex-1 text-left">{titulo}</span>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
          qtd === 0 ? "bg-white/5 text-white/25" : "bg-white/10 text-white"
        }`}>
          {qtd}
        </span>
        <ChevronRight className={`w-4 h-4 text-white/25 transition-transform duration-200 ${aberto ? "rotate-90" : ""}`} />
      </button>

      {aberto && (
        <div className="border-t border-white/5">
          {qtd === 0 ? (
            <p className="text-sm text-white/25 px-5 py-5 italic">{vazia}</p>
          ) : (
            <div className="p-3 space-y-2">{children}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

function AlertasContent() {
  const [data, setData]           = useState<AlertasResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [erro, setErro]           = useState<string | null>(null);
  const [atualizadoEm, setAt]     = useState<Date | null>(null);
  const [modalAlerta, setModal]   = useState<Alerta | null>(null);
  const [sucessoPago, setSucesso] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetchAlertas();
      setData(res);
      setAt(new Date());
    } catch {
      setErro("Não foi possível carregar os alertas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const handlePago = () => {
    setSucesso(true);
    setTimeout(() => setSucesso(false), 3000);
    carregar();
  };

  const total = data
    ? data.aniversarios.length + data.mensalidadesCriticas.length + data.semTreinar.length
    : 0;

  const totalCritico = data
    ? data.mensalidadesCriticas.filter(m => m.tipo === "mensalidade_atrasada").length
    : 0;

  return (
    <div className="text-white space-y-4">

      {/* ── HEADER ── */}
      <div className="rounded-2xl border border-white/8 bg-[#0d1424] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bell size={13} className="text-amber-400" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Central de alertas</p>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">Monitoramento</h1>
            <p className="text-xs text-white/30 mt-0.5">
              {atualizadoEm
                ? `Atualizado às ${atualizadoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                : "Aguardando dados..."}
            </p>
          </div>
          <button onClick={carregar} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/8 rounded-xl text-sm font-medium transition disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {/* Barra de resumo */}
        {!loading && data && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: "Aniversários",  value: data.aniversarios.length,        cor: "text-pink-400",  bg: "bg-pink-500/10",  border: "border-pink-500/20" },
              { label: "Mensalidades",  value: data.mensalidadesCriticas.length, cor: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
              { label: "Sem treinar",   value: data.semTreinar.length,           cor: "text-red-400",   bg: "bg-red-500/10",   border: "border-red-500/20" },
            ].map(s => (
              <div key={s.label} className={`rounded-xl ${s.bg} border ${s.border} px-3 py-3 text-center`}>
                <p className={`text-2xl font-black ${s.cor}`}>{s.value}</p>
                <p className="text-[10px] text-white/30 mt-0.5 uppercase tracking-wider font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast de sucesso */}
      {sucessoPago && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-400">
          <Check size={16} className="shrink-0" />
          Pagamento registrado com sucesso!
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          <AlertTriangle size={16} className="shrink-0" />
          {erro}
        </div>
      )}

      {/* Alerta crítico de inadimplência */}
      {!loading && totalCritico > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/8 border border-red-500/20 rounded-xl">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            <span className="font-bold">{totalCritico} mensalidade{totalCritico !== 1 ? "s" : ""}</span> em atraso — clique para registrar pagamento.
          </p>
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/8 bg-[#0d1424] p-5 space-y-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/8" />
                <div className="h-4 w-36 bg-white/8 rounded" />
              </div>
              <div className="h-14 w-full bg-white/5 rounded-xl" />
              <div className="h-14 w-full bg-white/5 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Seções */}
      {!loading && !erro && data && (
        <div className="space-y-4">

          {/* Aniversariantes */}
          <Secao
            titulo="Aniversariantes"
            icone={<span className="text-sm">🎂</span>}
            corIcone="text-pink-400"
            corBg="bg-pink-500/15"
            qtd={data.aniversarios.length}
            vazia="Nenhum aniversário nos próximos 7 dias."
          >
            {data.aniversarios.map((a, i) => (
              <CardAniversario key={`${a.usuarioId}-${i}`} alerta={a} />
            ))}
          </Secao>

          {/* Mensalidades críticas */}
          <Secao
            titulo="Mensalidades críticas"
            icone={<CreditCard size={15} />}
            corIcone="text-amber-400"
            corBg="bg-amber-500/15"
            qtd={data.mensalidadesCriticas.length}
            vazia="Nenhuma mensalidade atrasada ou vencendo em breve."
          >
            {/* Separador: atrasadas x vencendo */}
            {data.mensalidadesCriticas.filter(m => m.tipo === "mensalidade_atrasada").length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-widest font-bold text-red-400/60 px-1 pt-1">
                  Em atraso ({data.mensalidadesCriticas.filter(m => m.tipo === "mensalidade_atrasada").length})
                </p>
                {data.mensalidadesCriticas
                  .filter(m => m.tipo === "mensalidade_atrasada")
                  .map((a, i) => (
                    <CardMensalidade key={`atrasada-${a.usuarioId}-${i}`} alerta={a} onClick={() => setModal(a)} />
                  ))}
              </>
            )}
            {data.mensalidadesCriticas.filter(m => m.tipo === "mensalidade_vencendo").length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-widest font-bold text-amber-400/60 px-1 pt-2">
                  Vencendo em breve ({data.mensalidadesCriticas.filter(m => m.tipo === "mensalidade_vencendo").length})
                </p>
                {data.mensalidadesCriticas
                  .filter(m => m.tipo === "mensalidade_vencendo")
                  .map((a, i) => (
                    <CardMensalidade key={`vencendo-${a.usuarioId}-${i}`} alerta={a} onClick={() => setModal(a)} />
                  ))}
              </>
            )}
          </Secao>

          {/* Sem treinar */}
          <Secao
            titulo="Alunos sem treinar"
            icone={<Dumbbell size={15} />}
            corIcone="text-red-400"
            corBg="bg-red-500/15"
            qtd={data.semTreinar.length}
            vazia="Todos os alunos treinaram nos últimos 7 dias."
          >
            {/* Separador: crítico x atenção */}
            {data.semTreinar.filter(a => (a.diasSemTreinar ?? 0) > 14).length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-widest font-bold text-red-400/60 px-1 pt-1">
                  Crítico — mais de 14 dias ({data.semTreinar.filter(a => (a.diasSemTreinar ?? 0) > 14).length})
                </p>
                {data.semTreinar.filter(a => (a.diasSemTreinar ?? 0) > 14).map((a, i) => (
                  <CardSemTreinar key={`critico-${a.usuarioId}-${i}`} alerta={a} />
                ))}
              </>
            )}
            {data.semTreinar.filter(a => (a.diasSemTreinar ?? 0) <= 14).length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-widest font-bold text-amber-400/60 px-1 pt-2">
                  Atenção — entre 7 e 14 dias ({data.semTreinar.filter(a => (a.diasSemTreinar ?? 0) <= 14).length})
                </p>
                {data.semTreinar.filter(a => (a.diasSemTreinar ?? 0) <= 14).map((a, i) => (
                  <CardSemTreinar key={`atencao-${a.usuarioId}-${i}`} alerta={a} />
                ))}
              </>
            )}
          </Secao>
        </div>
      )}

      {/* Tudo em dia */}
      {!loading && !erro && total === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">✅</div>
          <p className="font-bold text-white/60">Tudo em dia</p>
          <p className="text-sm text-white/25 mt-1">Nenhum alerta pendente no momento.</p>
        </div>
      )}

      {/* Modal de detalhes de mensalidade */}
      {modalAlerta && (
        <MensalidadeModal
          alerta={modalAlerta}
          onFechar={() => setModal(null)}
          onPago={handlePago}
        />
      )}
    </div>
  );
}

export default function AlertasPage() {
  return (
    <RotaProtegida role="admin">
      <AlertasContent />
    </RotaProtegida>
  );
}