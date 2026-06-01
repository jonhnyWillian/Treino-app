"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, UserPlus, User, Phone, Mail, Calendar, X, Pencil, Eye, PowerOff, Shield, RefreshCw,  ChevronDown, Weight, Ruler, Lock} from "lucide-react";
import toast from "react-hot-toast";
import { listarClientes, cadastrarCliente, ClienteLista } from "@/services/api";
import RotaProtegida from "@/components/ui/RotaProtegida";

type Cliente = ClienteLista;

type NovoCliente = {
  nome: string;
  idade: string;
  sexo: string;
  email: string;
  telefone: string;
  senha: string;
  dataNascimento: string;
};

type PatchPayload = {
  email?: string;
  telefone?: string;
  idade?: number | null;
  sexo?: string;
  peso?: number | null;
  altura?: number | null;
  senha?: string;
  situacao?: string;
};

const campoVazio: NovoCliente = {
  nome: "", idade: "", sexo: "", email: "", telefone: "", senha: "", dataNascimento: "",
};

const API = process.env.NEXT_PUBLIC_API_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatarData = (data?: string | null) => {
  if (!data) return "—";
  const [ano, mes, dia] = data.split("T")[0].split("-");
  return `${dia}/${mes}/${ano}`;
};

const inputCls = "h-11 w-full rounded-xl border border-white/8 bg-white/5 px-4 text-sm text-white placeholder:text-white/20 outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 transition";
const labelCls = "text-[10px] font-bold uppercase tracking-[0.2em] text-white/30";
const readOnlyCls = "h-11 w-full rounded-xl border border-white/5 bg-white/[0.03] px-4 text-sm text-white/30 cursor-not-allowed outline-none";

// ─── EditarModal ──────────────────────────────────────────────────────────────

function EditarModal({ cliente, onFechar, onSalvo }: {
  cliente: Cliente;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [form, setForm] = useState({
    email: cliente.email ?? "",
    telefone: cliente.telefone ?? "",
    idade: cliente.idade ? String(cliente.idade) : "",
    sexo: cliente.sexo ?? "",
    peso: cliente.peso ? String(cliente.peso) : "",
    altura: cliente.altura ? String(cliente.altura) : "",
    dataNascimento: cliente.dataNascimento ?? "",
    senha: "",
    confirmarSenha: "",
  });
  const [showSenha, setShowSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aba, setAba] = useState<"dados" | "fisica" | "acesso">("dados");

  const handleField = (k: keyof typeof form, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSalvar = async () => {
    if (!form.email.trim()) { toast.error("Email é obrigatório."); return; }
    if (form.senha && form.senha.length < 8) { toast.error("Senha deve ter mínimo 8 caracteres."); return; }
    if (form.senha && form.senha !== form.confirmarSenha) { toast.error("As senhas não coincidem."); return; }

    const payload: PatchPayload = {
      email: form.email,
      telefone: form.telefone || undefined,
      idade: form.idade ? Number(form.idade) : null,
      sexo: form.sexo || undefined,
      peso: form.peso ? parseFloat(form.peso) : null,
      altura: form.altura ? parseFloat(form.altura) : null,
    };
    if (form.senha) payload.senha = form.senha;

    setSalvando(true);
    try {
      const res = await fetch(`${API}/users/${cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Erro ao salvar.");
      }
      toast.success("Cliente atualizado!");
      onSalvo();
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const abas = [
    { key: "dados",  label: "Dados pessoais" },
    { key: "fisica", label: "Físico" },
    { key: "acesso", label: "Acesso" },
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#0a0f1c] border border-white/8 shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Pencil size={16} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Editar cliente</h3>
              <p className="text-[11px] text-white/30 mt-0.5">ID #{cliente.id} · Nome não editável</p>
            </div>
          </div>
          <button onClick={onFechar}
            className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition">
            <X size={15} />
          </button>
        </div>

        {/* Nome somente leitura — sempre visível */}
        <div className="px-6 pt-4 shrink-0">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
              {cliente.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{cliente.nome}</p>
              <p className="text-[10px] text-white/25 flex items-center gap-1">
                <Lock size={9} />
                Nome não pode ser alterado
              </p>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-1 px-6 pt-4 shrink-0">
          {abas.map(a => (
            <button key={a.key} onClick={() => setAba(a.key)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
                aba === a.key
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                  : "text-white/30 hover:text-white/60 hover:bg-white/5"
              }`}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Campos */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">

          {/* ─── ABA DADOS PESSOAIS ─── */}
          {aba === "dados" && (
            <>
              <div className="space-y-1.5">
                <label className={labelCls}>Email *</label>
                <input value={form.email} onChange={e => handleField("email", e.target.value)}
                  inputMode="email" placeholder="nome@exemplo.com" className={inputCls} />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Telefone</label>
                <input value={form.telefone} onChange={e => handleField("telefone", e.target.value)}
                  inputMode="tel" placeholder="(11) 99999-9999" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelCls}>Idade</label>
                  <input value={form.idade} onChange={e => handleField("idade", e.target.value)}
                    inputMode="numeric" placeholder="Ex: 28" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Gênero</label>
                  <div className="relative">
                    <select value={form.sexo} onChange={e => handleField("sexo", e.target.value)}
                      className={`${inputCls} appearance-none pr-9`}>
                      <option value="">Selecione</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Outro">Outro</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>
                  Data de nascimento{" "}
                  <span className="normal-case tracking-normal font-normal text-white/20">(não editável)</span>
                </label>
                <input value={formatarData(form.dataNascimento)} readOnly className={readOnlyCls} />
                <p className="text-[10px] text-white/20">Definida no cadastro, não pode ser alterada.</p>
              </div>
            </>
          )}

          {/* ─── ABA FÍSICO ─── */}
          {aba === "fisica" && (
            <>
              <div className="rounded-xl bg-blue-500/5 border border-blue-500/15 px-4 py-3 flex items-start gap-2.5">
                <Shield size={13} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-300/70">
                  Dados físicos normalmente são atualizados pelo próprio aluno no app. Você pode ajustar aqui se necessário.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelCls}>
                    <span className="flex items-center gap-1.5"><Weight size={10} />Peso (kg)</span>
                  </label>
                  <input value={form.peso} onChange={e => handleField("peso", e.target.value)}
                    inputMode="decimal" placeholder="Ex: 75.5" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>
                    <span className="flex items-center gap-1.5"><Ruler size={10} />Altura (m)</span>
                  </label>
                  <input value={form.altura} onChange={e => handleField("altura", e.target.value)}
                    inputMode="decimal" placeholder="Ex: 1.78" className={inputCls} />
                </div>
              </div>

              {(form.peso || form.altura) && (
                <div className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2">Prévia</p>
                  <div className="flex items-center gap-4">
                    {form.peso && (
                      <div>
                        <p className="text-lg font-black text-white">{form.peso} <span className="text-xs text-white/30 font-normal">kg</span></p>
                      </div>
                    )}
                    {form.altura && (
                      <div>
                        <p className="text-lg font-black text-white">{form.altura} <span className="text-xs text-white/30 font-normal">m</span></p>
                      </div>
                    )}
                    {form.peso && form.altura && parseFloat(form.altura) > 0 && (
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider">IMC</p>
                        <p className="text-lg font-black text-emerald-400">
                          {(parseFloat(form.peso) / Math.pow(parseFloat(form.altura), 2)).toFixed(1)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── ABA ACESSO ─── */}
          {aba === "acesso" && (
            <>
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/15 px-4 py-3 flex items-start gap-2.5">
                <Shield size={13} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-300/70">
                  Deixe em branco para manter a senha atual. Preencha apenas se desejar redefinir o acesso do cliente.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Nova senha</label>
                <div className="relative">
                  <input value={form.senha} onChange={e => handleField("senha", e.target.value)}
                    type={showSenha ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    className={`${inputCls} pr-11`} />
                  <button type="button" onClick={() => setShowSenha(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
                    {showSenha
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M10.5 9.2C11 9.07 11.5 9 12 9C13.66 9 15 10.34 15 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M6.7 6.7C5.2 7.7 4 9.3 3 12C4.8 16.5 8.1 19 12 19C14.7 19 17.1 17.8 19.3 15.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 12C4.8 7.5 8.1 5 12 5C15.9 5 19.2 7.5 21 12C19.2 16.5 15.9 19 12 19C8.1 19 4.8 16.5 3 12Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>}
                  </button>
                </div>
                {form.senha && form.senha.length < 8 && (
                  <p className="text-[10px] text-red-400 font-semibold">Mínimo 8 caracteres</p>
                )}
              </div>

              {form.senha && (
                <div className="space-y-1.5">
                  <label className={labelCls}>Confirmar nova senha</label>
                  <input value={form.confirmarSenha} onChange={e => handleField("confirmarSenha", e.target.value)}
                    type={showSenha ? "text" : "password"}
                    placeholder="Repita a senha"
                    className={`${inputCls} ${
                      form.confirmarSenha && form.senha !== form.confirmarSenha
                        ? "border-red-500/50 focus:border-red-500/60 focus:ring-red-500/15"
                        : ""
                    }`} />
                  {form.confirmarSenha && form.senha !== form.confirmarSenha && (
                    <p className="text-[10px] text-red-400 font-semibold">As senhas não coincidem</p>
                  )}
                  {form.confirmarSenha && form.senha === form.confirmarSenha && (
                    <p className="text-[10px] text-emerald-400 font-semibold">✓ Senhas coincidem</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6 pt-2 shrink-0 border-t border-white/5">
          <button onClick={onFechar}
            className="flex-1 h-11 rounded-xl bg-white/5 text-sm font-semibold text-white/60 hover:bg-white/10 transition">
            Cancelar
          </button>
          <button onClick={handleSalvar} disabled={salvando}
            className="flex-1 h-11 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-500 transition disabled:opacity-60 flex items-center justify-center gap-2">
            {salvando
              ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CadastroModal ────────────────────────────────────────────────────────────

function CadastroModal({ onFechar, onSalvo }: { onFechar: () => void; onSalvo: () => void }) {
  const [form, setForm] = useState<NovoCliente>(campoVazio);
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const handleField = (k: keyof NovoCliente, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSalvar = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório."); return; }
    if (!form.email.trim()) { toast.error("Email é obrigatório."); return; }
    if (!form.senha || form.senha.length < 8) { toast.error("Senha deve ter pelo menos 8 caracteres."); return; }
    if (form.senha !== confirmarSenha) { toast.error("As senhas não coincidem."); return; }

    setSalvando(true);
    try {
      await cadastrarCliente(form);
      toast.success("Cliente cadastrado!");
      onSalvo();
      onFechar();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#0a0f1c] border border-white/8 shadow-2xl max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <UserPlus size={16} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Novo cliente</h3>
              <p className="text-[11px] text-white/30">Preencha os dados para cadastrar</p>
            </div>
          </div>
          <button onClick={onFechar}
            className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition">
            <X size={15} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Nome completo *</label>
            <input value={form.nome} onChange={e => handleField("nome", e.target.value)}
              placeholder="Ex: João da Silva" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className={labelCls}>Idade</label>
              <input value={form.idade} onChange={e => handleField("idade", e.target.value)}
                inputMode="numeric" placeholder="Ex: 28" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Gênero</label>
              <div className="relative">
                <select value={form.sexo} onChange={e => handleField("sexo", e.target.value)}
                  className={`${inputCls} appearance-none pr-9`}>
                  <option value="">Selecione</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Data de nascimento</label>
            <input value={form.dataNascimento} onChange={e => handleField("dataNascimento", e.target.value)}
              type="date" className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Email *</label>
            <input value={form.email} onChange={e => handleField("email", e.target.value)}
              inputMode="email" placeholder="nome@exemplo.com" className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Telefone</label>
            <input value={form.telefone} onChange={e => handleField("telefone", e.target.value)}
              inputMode="tel" placeholder="(11) 99999-9999" className={inputCls} />
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Senha *</label>
            <div className="relative">
              <input value={form.senha} onChange={e => handleField("senha", e.target.value)}
                type={showSenha ? "text" : "password"} placeholder="Mínimo 8 caracteres"
                className={`${inputCls} pr-11`} />
              <button type="button" onClick={() => setShowSenha(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
                {showSenha
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M10.5 9.2C11 9.07 11.5 9 12 9C13.66 9 15 10.34 15 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/><path d="M6.7 6.7C5.2 7.7 4 9.3 3 12C4.8 16.5 8.1 19 12 19C14.7 19 17.1 17.8 19.3 15.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 12C4.8 7.5 8.1 5 12 5C15.9 5 19.2 7.5 21 12C19.2 16.5 15.9 19 12 19C8.1 19 4.8 16.5 3 12Z" stroke="currentColor" strokeWidth="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Confirmar senha *</label>
            <input value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)}
              type={showSenha ? "text" : "password"} placeholder="Repita a senha"
              className={`${inputCls} ${confirmarSenha && form.senha !== confirmarSenha ? "border-red-500/50" : ""}`} />
            {confirmarSenha && form.senha !== confirmarSenha && (
              <p className="text-[10px] text-red-400 font-semibold">As senhas não coincidem</p>
            )}
            {confirmarSenha && form.senha === confirmarSenha && (
              <p className="text-[10px] text-emerald-400 font-semibold">✓ Senhas coincidem</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6 pt-2 shrink-0 border-t border-white/5">
          <button onClick={onFechar}
            className="flex-1 h-11 rounded-xl bg-white/5 text-sm font-semibold text-white/60 hover:bg-white/10 transition">
            Cancelar
          </button>
          <button onClick={handleSalvar} disabled={salvando}
            className="flex-1 h-11 rounded-xl bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-500 transition disabled:opacity-60 flex items-center justify-center gap-2">
            {salvando
              ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              : "Cadastrar cliente"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ClienteContent() {
  const [clientes, setClientes]         = useState<Cliente[]>([]);
  const [loading, setLoading]           = useState(true);
  const [busca, setBusca]               = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "desativado">("todos");
  const [showCadastro, setShowCadastro] = useState(false);
  const [clienteEditando, setEditando]  = useState<Cliente | null>(null);
  const [clienteDetalhes, setDetalhes]  = useState<Cliente | null>(null);
  const [desativando, setDesativando]   = useState<number | null>(null);

  const fetchClientes = useCallback(async () => {
    try {
      const data = await listarClientes();
      setClientes(data);
    } catch {
      toast.error("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const totalAtivos   = clientes.filter(c => c.situacao !== "desativado").length;
  const totalInativos = clientes.filter(c => c.situacao === "desativado").length;

  const clientesFiltrados = clientes
    .filter(c => {
      if (filtroStatus === "ativo")     return c.situacao !== "desativado";
      if (filtroStatus === "desativado") return c.situacao === "desativado";
      return true;
    })
    .filter(c =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.email.toLowerCase().includes(busca.toLowerCase())
    );

  const handleDesativar = async (cliente: Cliente) => {
    if (!confirm(`Desativar a conta de "${cliente.nome}"?`)) return;
    setDesativando(cliente.id);
    try {
      await fetch(`${API}/users/${cliente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ situacao: "desativado" }),
      });
      toast.success(`Conta de "${cliente.nome}" desativada.`);
      await fetchClientes();
    } catch {
      toast.error("Erro ao desativar.");
    } finally {
      setDesativando(null);
    }
  };

  return (
    <div className="text-white space-y-4">

      {/* ── HEADER ── */}
      <div className="rounded-2xl border border-white/8 bg-[#0d1424] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold">Cadastro de Clientes</h1>
            <p className="text-xs text-white/30 mt-0.5">
              {loading ? "Carregando..." : `${clientes.length} cliente${clientes.length !== 1 ? "s" : ""} cadastrado${clientes.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro status */}
            <div className="flex items-center gap-1 rounded-xl border border-white/8 bg-white/5 p-1">
              {([
                { key: "todos",      label: "Todos" },
                { key: "ativo",      label: "Ativos" },
                { key: "desativado", label: "Inativos" },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setFiltroStatus(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filtroStatus === f.key
                      ? "bg-white/10 text-white"
                      : "text-white/30 hover:text-white/60"
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>

            {/* Busca */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input value={busca} onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="h-9 w-60 rounded-xl border border-white/8 bg-white/5 pl-9 pr-4 text-sm text-white placeholder:text-white/25 outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition" />
            </div>

            {/* Refresh */}
            <button onClick={fetchClientes} title="Atualizar"
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-white/8 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition">
              <RefreshCw size={14} />
            </button>

            {/* Novo cliente */}
            <button onClick={() => setShowCadastro(true)}
              className="flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500 transition">
              <UserPlus size={14} />
              Novo cliente
            </button>
          </div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total",    value: clientes.length, cor: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/15" },
          { label: "Ativos",   value: totalAtivos,     cor: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/15" },
          { label: "Este mês", value: 0,               cor: "text-white/50",    bg: "bg-white/5",        border: "border-white/8" },
          { label: "Inativos", value: totalInativos,   cor: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/15" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border ${s.border} ${s.bg} p-5`}>
            <p className={labelCls}>{s.label}</p>
            <p className={`mt-2 text-3xl font-black ${s.cor}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── TABELA ── */}
      <div className="rounded-2xl border border-white/8 bg-[#0d1424] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Clientes cadastrados</h3>
            <p className="text-xs text-white/30 mt-0.5">
              {busca || filtroStatus !== "todos"
                ? `${clientesFiltrados.length} resultado${clientesFiltrados.length !== 1 ? "s" : ""}`
                : "Todos os clientes"}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="text-white/30 text-sm">Carregando clientes...</p>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-14 w-14 flex items-center justify-center rounded-2xl bg-white/5">
              <User size={24} className="text-white/15" />
            </div>
            <p className="text-white/25 text-sm">
              {busca ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
            </p>
            {!busca && (
              <button onClick={() => setShowCadastro(true)}
                className="flex items-center gap-2 rounded-xl bg-emerald-600/20 border border-emerald-500/20 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-600/30 transition">
                <UserPlus size={14} />Cadastrar primeiro cliente
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {/* Cabeçalho */}
            <div className="grid grid-cols-[1fr_1fr_110px_70px_100px_120px] gap-3 px-4 pb-2 border-b border-white/5">
              {["Nome", "Email", "Telefone", "Idade", "Status", "Ações"].map(h => (
                <span key={h} className={labelCls}>{h}</span>
              ))}
            </div>

            {clientesFiltrados.map(cliente => {
              const ativo = cliente.situacao !== "desativado";
              return (
                <div key={cliente.id}
                  className="group grid grid-cols-[1fr_1fr_110px_70px_100px_120px] gap-3 items-center rounded-xl px-4 py-3 hover:bg-white/[0.03] transition">
                  {/* Nome */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                      ativo ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-white/25"
                    }`}>
                      {cliente.nome.charAt(0).toUpperCase()}
                    </div>
                    <span className={`text-sm font-medium truncate ${ativo ? "text-white" : "text-white/35 line-through"}`}>
                      {cliente.nome}
                    </span>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail size={11} className="text-white/20 shrink-0" />
                    <span className="text-sm text-white/45 truncate">{cliente.email}</span>
                  </div>

                  {/* Telefone */}
                  <div className="flex items-center gap-2">
                    <Phone size={11} className="text-white/20 shrink-0" />
                    <span className="text-sm text-white/45">{cliente.telefone || "—"}</span>
                  </div>

                  {/* Idade */}
                  <div className="flex items-center gap-2">
                    <Calendar size={11} className="text-white/20 shrink-0" />
                    <span className="text-sm text-white/45">{cliente.idade ?? "—"}</span>
                  </div>

                  {/* Status */}
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                    ativo
                      ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                      : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${ativo ? "bg-emerald-400" : "bg-red-400"}`} />
                    {ativo ? "Ativo" : "Inativo"}
                  </span>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setDetalhes(cliente)} title="Ver detalhes"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition">
                      <Eye size={13} />
                    </button>
                    {ativo && (
                      <button onClick={() => setEditando(cliente)} title="Editar"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition">
                        <Pencil size={13} />
                      </button>
                    )}
                    {ativo && (
                      <button onClick={() => handleDesativar(cliente)} disabled={desativando === cliente.id}
                        title="Desativar"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-40">
                        {desativando === cliente.id
                          ? <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                          : <PowerOff size={13} />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL DETALHES ── */}
      {clienteDetalhes && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0a0f1c] border border-white/8 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-black ${
                  clienteDetalhes.situacao !== "desativado" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                }`}>
                  {clienteDetalhes.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{clienteDetalhes.nome}</h3>
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                    clienteDetalhes.situacao !== "desativado" ? "text-emerald-400" : "text-red-400"
                  }`}>
                    {clienteDetalhes.situacao !== "desativado" ? "● Ativo" : "● Inativo"}
                  </span>
                </div>
              </div>
              <button onClick={() => setDetalhes(null)}
                className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white transition">
                <X size={15} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-0">
              {[
                { label: "ID",           value: `#${clienteDetalhes.id}` },
                { label: "Email",        value: clienteDetalhes.email },
                { label: "Telefone",     value: clienteDetalhes.telefone || "—" },
                { label: "Idade",        value: clienteDetalhes.idade ? `${clienteDetalhes.idade} anos` : "—" },
                { label: "Gênero",       value: clienteDetalhes.sexo || "—" },
                { label: "Nascimento",   value: formatarData(clienteDetalhes.dataNascimento) },
                { label: "Peso",         value: clienteDetalhes.peso ? `${clienteDetalhes.peso} kg` : "—" },
                { label: "Altura",       value: clienteDetalhes.altura ? `${clienteDetalhes.altura} m` : "—" },
                { label: "Cadastrado em",value: formatarData(clienteDetalhes.dataCriacao) },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0 gap-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/25 shrink-0">{item.label}</span>
                  <span className="text-sm text-white/75 font-medium text-right">{item.value}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 px-6 pb-6">
              {clienteDetalhes.situacao !== "desativado" && (
                <button
                  onClick={() => { setDetalhes(null); setEditando(clienteDetalhes); }}
                  className="flex-1 h-10 rounded-xl bg-amber-500/10 text-sm font-semibold text-amber-400 hover:bg-amber-500/20 transition flex items-center justify-center gap-2">
                  <Pencil size={13} />Editar
                </button>
              )}
              <button onClick={() => setDetalhes(null)}
                className="flex-1 h-10 rounded-xl bg-white/5 text-sm font-semibold text-white/50 hover:bg-white/10 transition">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modais */}
      {showCadastro && (
        <CadastroModal onFechar={() => setShowCadastro(false)} onSalvo={fetchClientes} />
      )}
      {clienteEditando && (
        <EditarModal
          cliente={clienteEditando}
          onFechar={() => setEditando(null)}
          onSalvo={fetchClientes}
        />
      )}
    </div>
  );
}

export default function ClientePage() {
  return (
    <RotaProtegida role="admin">
      <ClienteContent />
    </RotaProtegida>
  );
}