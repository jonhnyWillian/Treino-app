"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Edit, Logout, Person, Settings, LockReset, NoAccounts } from "@mui/icons-material";
import { desativarConta, getPerfil, patchPerfil, redefinirSenhaLogado } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import RotaProtegida from "@/components/ui/RotaProtegida";
import toast from "react-hot-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Usuario = {
  id: number;
  nome: string;
  email: string;
  idade?: number;
  peso?: number;
  altura?: number;
  fotoPerfil?: string | null;
};

// ─── Constantes ───────────────────────────────────────────────────────────────

// Classes base dos inputs de métricas físicas — extraídas para evitar repetição
// entre os campos de peso e altura.
const INPUT_CLS =
  "h-11 w-full rounded-xl border border-white/10 bg-slate-900 px-4 text-sm " +
  "outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

const LABEL_CLS =
  "text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Converte um valor numérico vindo da API para string usável em input controlado.
 * Retorna string vazia para valores nulos, indefinidos, inválidos ou negativos —
 * evita exibir "0" ou "NaN" nos campos de peso e altura.
 */
function metricaApiParaInput(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(n);
}

/**
 * Comprime uma imagem de perfil para JPEG 720px máximo e qualidade 75%.
 * Usa Canvas 2D para redimensionar antes de converter para data URL,
 * evitando enviar imagens grandes demais para o banco.
 */
async function compressImageToDataUrl(file: File): Promise<string> {
  const imageBitmap = await createImageBitmap(file);
  const maxSide = 720;
  const scale = Math.min(1, maxSide / Math.max(imageBitmap.width, imageBitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(imageBitmap.width * scale));
  canvas.height = Math.max(1, Math.round(imageBitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
  imageBitmap.close();
  return canvas.toDataURL("image/jpeg", 0.75);
}

// ─── Conteúdo principal do Perfil ────────────────────────────────────────────

/**
 * PerfilContent contém toda a lógica e UI da página de perfil.
 * É envolvido por `PerfilPage` com `RotaProtegida` para garantir
 * que só renderiza quando o usuário está autenticado.
 */
function PerfilContent() {
  const router = useRouter();

  // setUsuario do contexto é usado no logout para limpar a sessão global
  const { setUsuario: setUsuarioContexto } = useAuth();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showDesativarModal, setShowDesativarModal] = useState(false);
  const [desativando, setDesativando] = useState(false);

  // Carrega os dados do perfil ao montar o componente.
  // A autenticação já é garantida pelo RotaProtegida — se o cookie
  // for inválido, o RotaProtegida redireciona antes de chegar aqui.
  useEffect(() => {
    getPerfil()
      .then((data) => {
        if (data?.id) {
          setUsuario(data);
          setPeso(metricaApiParaInput(data.peso));
          setAltura(metricaApiParaInput(data.altura));
          setFotoPerfil(data.fotoPerfil ?? null);
        }
      })
      .catch(() => toast.error("Erro ao carregar perfil"));
  }, []);

  // IMC calculado como valor derivado — recalcula automaticamente
  // quando peso ou altura mudam, sem precisar de useEffect extra.
  const bmi = useMemo(() => {
    const p = Number(peso), a = Number(altura);
    if (!Number.isFinite(p) || !Number.isFinite(a) || p <= 0 || a <= 0) return null;
    const v = p / (a * a);
    return Number.isFinite(v) ? Math.round(v * 10) / 10 : null;
  }, [peso, altura]);

  // Label e cor do IMC derivados do valor calculado
  const bmiLabel = bmi === null ? null
    : bmi < 18.5 ? { texto: "Abaixo do peso", cor: "text-yellow-400" }
      : bmi < 25 ? { texto: "Peso normal", cor: "text-emerald-400" }
        : bmi < 30 ? { texto: "Sobrepeso", cor: "text-orange-400" }
          : { texto: "Obesidade", cor: "text-red-400" };

  /**
   * Realiza o logout do usuário.
   * Limpa o contexto React (usuario → null) e chama a rota de logout
   * no backend para invalidar o cookie HTTP-only.
   * Sem isso, o cookie continuaria válido mesmo após "sair".
   */
  const sair = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Silencioso: mesmo se falhar, limpa o contexto local e redireciona
    }
    setUsuarioContexto(null); // limpa o contexto — sem localStorage
    router.push("/");
  };

  /**
   * Desativa a conta do usuário (soft delete no backend).
   * Após confirmação, chama o endpoint de desativação e faz logout.
   */
  const confirmarDesativarConta = async () => {
    setDesativando(true);
    try {
      const res = await desativarConta();
      if (res.message) {
        toast.success("Conta desativada. Saindo...");
        await sair();
      } else {
        toast.error("Erro ao desativar conta.");
      }
    } catch {
      toast.error("Erro na conexão com o servidor.");
    } finally {
      setDesativando(false);
      setShowDesativarModal(false);
    }
  };

  /**
   * Redefine a senha do usuário autenticado.
   * Valida localmente antes de chamar a API para evitar requisições desnecessárias.
   */
  const confirmarRedefinirSenha = async () => {
    if (!novaSenha || novaSenha.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }
    try {
      await redefinirSenhaLogado(novaSenha);
      toast.success("Senha redefinida com sucesso!");
      setShowPasswordModal(false);
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na conexão.");
    }
  };

  /**
   * Salva peso, altura e foto de perfil via PATCH.
   * Após salvar, atualiza o estado local com os dados retornados pelo banco
   * — evita mostrar dados stale do formulário.
   */
  const salvarAlteracoes = async () => {
    const p = peso.trim() === "" ? undefined : Number(peso);
    const a = altura.trim() === "" ? undefined : Number(altura);

    if (p !== undefined && (!Number.isFinite(p) || p <= 0)) {
      toast.error("Peso inválido."); return;
    }
    if (a !== undefined && (!Number.isFinite(a) || a <= 0)) {
      toast.error("Altura inválida."); return;
    }

    setSalvando(true);
    try {
      const data = await patchPerfil({ peso: p, altura: a, fotoPerfil });
      if (data.id) {
        setUsuario(data);
        setUsuarioContexto(data);
        setPeso(metricaApiParaInput(data.peso));
        setAltura(metricaApiParaInput(data.altura));
        setFotoPerfil(data.fotoPerfil ?? null);
        toast.success("Alterações salvas!");
      } else {
        throw new Error(data.message || "Erro ao salvar");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  };

  /**
   * Processa a seleção de foto de perfil.
   * Valida tipo e tamanho antes de comprimir — rejeita arquivos > 8MB
   * ou que não sejam imagens.
   */
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione apenas imagens."); return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Máximo 8MB."); e.target.value = ""; return;
    }
    try {
      const result = await compressImageToDataUrl(file);
      if (result.length > 900_000) {
        toast.error("Imagem muito grande."); e.target.value = ""; return;
      }
      setFotoPerfil(result);
      toast.success("Foto carregada. Clique em salvar.");
    } catch {
      toast.error("Não foi possível processar a imagem.");
    }
    e.target.value = "";
  };

  // Enquanto o perfil não carregou, mostra indicador de carregamento.
  // O RotaProtegida já garantiu que há sessão válida — aqui é só esperar
  // os dados do banco chegarem.
  if (!usuario) {
    return (
      <div className="flex h-full items-center justify-center text-white/40 text-sm">
        Carregando...
      </div>
    );
  }

  return (
    <div className="text-white flex flex-col gap-4">

      {/* ── HEADER DO PERFIL ── */}
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          {/* Avatar + nome + email */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-[#0d162c] ring-2 ring-emerald-400/50 ring-offset-2 ring-offset-[#111827]">
                {fotoPerfil ? (
                  <Image src={fotoPerfil} alt="Foto de perfil" fill sizes="64px" className="object-cover" />
                ) : (
                  <Person className="absolute inset-0 m-auto text-white/40" sx={{ fontSize: 36 }} />
                )}
              </div>
              {/* Botão de editar foto sobreposto ao avatar */}
              <label
                htmlFor="fotoPerfilInput"
                className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition"
              >
                <Edit sx={{ fontSize: 12 }} />
              </label>
              <input
                id="fotoPerfilInput"
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                className="hidden"
              />
            </div>

            <div>
              <h1 className="text-lg font-bold leading-tight">{usuario.nome}</h1>
              <p className="text-xs text-white/40 mt-0.5">{usuario.email}</p>
              {usuario.idade && (
                <p className="text-xs text-white/30 mt-0.5">{usuario.idade} anos</p>
              )}
            </div>
          </div>

          {/* Ações do perfil */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={salvarAlteracoes}
              disabled={salvando}
              className="flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60 transition"
            >
              {salvando ? "Salvando..." : "Salvar alterações"}
            </button>

            <button
              onClick={() => setShowPasswordModal(true)}
              className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white/70 hover:bg-white/10 transition"
            >
              <LockReset sx={{ fontSize: 15 }} />
              Redefinir senha
            </button>

            <button
              onClick={sair}
              className="flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white/70 hover:bg-white/10 transition"
            >
              <Logout sx={{ fontSize: 15 }} className="text-orange-400" />
              Logout
            </button>

            <button
              onClick={() => setShowDesativarModal(true)}
              className="flex h-9 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 text-sm text-red-400 hover:bg-red-500/20 transition"
            >
              <NoAccounts sx={{ fontSize: 15 }} />
              Desativar conta
            </button>
          </div>

        </div>
      </div>

      {/* ── STATS ROW ── */}
      {/* Cards de métricas derivadas — IMC calculado localmente, demais vindos da API */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Idade", value: usuario.idade ?? "-", cor: "text-emerald-400", sub: usuario.idade ? "anos" : "" },
          { label: "IMC", value: bmi ?? "-", cor: "text-cyan-400", sub: bmiLabel?.texto ?? "" },
          { label: "Peso", value: peso || "-", cor: "text-white", sub: peso ? "kg" : "" },
          { label: "Altura", value: altura || "-", cor: "text-white", sub: altura ? "m" : "" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-[#111827] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">{s.label}</p>
            <p className={`mt-2 text-3xl font-black ${s.cor}`}>{s.value}</p>
            {s.sub && <p className="mt-1 text-xs text-white/30">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── MÉTRICAS FÍSICAS ── */}
      <div className="rounded-2xl border border-white/10 bg-[#111827] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold">Métricas Físicas</h3>
            <p className="text-xs text-white/40 mt-0.5">Atualize seus dados físicos</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Settings sx={{ fontSize: 16 }} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className={LABEL_CLS}>Peso (KG)</label>
            <input
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              inputMode="decimal"
              placeholder="Ex: 80"
              className={INPUT_CLS}
            />
          </div>
          <div className="space-y-1.5">
            <label className={LABEL_CLS}>Altura (M)</label>
            <input
              value={altura}
              onChange={(e) => setAltura(e.target.value)}
              inputMode="decimal"
              placeholder="Ex: 1.75"
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>

      {/* ── MODAL SENHA ── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0f172a] border border-white/10 p-8 shadow-2xl space-y-5">
            <div className="text-center">
              <div className="h-12 w-12 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 mb-3">
                <LockReset sx={{ fontSize: 24 }} />
              </div>
              <h3 className="text-lg font-bold">Redefinir Senha</h3>
              <p className="text-sm text-white/40 mt-1">Crie uma nova senha de acesso.</p>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="Nova senha (mín. 8 caracteres)"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                className="w-full h-11 rounded-xl bg-white/5 px-4 text-sm text-white ring-1 ring-white/10 focus:ring-blue-500 outline-none transition"
              />
              <input
                type="password"
                placeholder="Confirmar senha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full h-11 rounded-xl bg-white/5 px-4 text-sm text-white ring-1 ring-white/10 focus:ring-blue-500 outline-none transition"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPasswordModal(false); setNovaSenha(""); setConfirmarSenha(""); }}
                className="flex-1 h-11 rounded-xl bg-white/5 text-sm font-semibold hover:bg-white/10 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRedefinirSenha}
                className="flex-1 h-11 rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-500 transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DESATIVAR ── */}
      {showDesativarModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0f172a] border border-white/10 p-8 shadow-2xl space-y-5">
            <div className="text-center">
              <div className="h-12 w-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mb-3">
                <NoAccounts sx={{ fontSize: 24 }} />
              </div>
              <h3 className="text-lg font-bold">Desativar Conta</h3>
              <p className="text-sm text-white/40 mt-1">
                Você{" "}
                <span className="text-red-400 font-medium">não poderá mais fazer login</span>{" "}
                após desativar.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDesativarModal(false)}
                disabled={desativando}
                className="flex-1 h-11 rounded-xl bg-white/5 text-sm font-semibold hover:bg-white/10 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDesativarConta}
                disabled={desativando}
                className="flex-1 h-11 rounded-xl bg-red-600 text-sm font-bold text-white hover:bg-red-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {desativando ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Desativando...
                  </>
                ) : "Sim, desativar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Export principal ─────────────────────────────────────────────────────────

/**
 * PerfilPage envolve o conteúdo com RotaProtegida.
 * Aguarda o AuthProvider terminar de verificar o cookie antes de
 * decidir renderizar ou redirecionar para o login.
 */
export default function PerfilPage() {
  return (
    <RotaProtegida>
      <PerfilContent />
    </RotaProtegida>
  );
}