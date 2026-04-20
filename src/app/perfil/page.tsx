"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowBackIosNew,
  Edit,
  Logout,
  Person,
  Settings,
  LockReset,
  NoAccounts,
} from "@mui/icons-material";
import { desativarConta, getPerfil, patchPerfil, redefinirSenhaLogado } from "@/services/api";
import toast from "react-hot-toast";

type Usuario = {
  id: number;
  nome: string;
  email: string;
  idade?: number;
  peso?: number;
  altura?: number;
  fotoPerfil?: string | null;
};

function metricaApiParaInput(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(n);
}

export default function PerfilPage() {

  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [peso, setPeso] = useState<string>("");
  const [altura, setAltura] = useState<string>("");
  const [salvando, setSalvando] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);

  const handleRedefinirSenha = () => {
    setShowSettings(false);
    setShowPasswordModal(true);
  };

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
      const res = await redefinirSenhaLogado(novaSenha);
      const data = await res.json();
      if (res.ok) {
        toast.success("Senha redefinida com sucesso!");
        setShowPasswordModal(false);
        setNovaSenha("");
        setConfirmarSenha("");
      } else {
        toast.error(data.message || "Erro ao redefinir senha.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro na conexão com o servidor.");
    }
  };

  const handleDesativarConta = async () => {
    if (!confirm("Tem certeza que deseja desativar sua conta? Você não poderá mais fazer login.")) return;

    try {
      const res = await desativarConta();
      if (res.ok) {
        toast.success("Conta desativada. Saindo...");
        sair();
      } else {
        toast.error("Erro ao desativar conta.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro na conexão com o servidor.");
    }
  };

  useEffect(() => {
    const buscarUsuario = async () => {
      try {
        const data = await getPerfil();
        if (data.nome) {
          setUsuario(data);
          setPeso(metricaApiParaInput(data.peso));
          setAltura(metricaApiParaInput(data.altura));
          setFotoPerfil(data.fotoPerfil ?? null);
        } else {
          router.push("/");
        }
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar perfil");
        router.push("/");
      }
    };

    buscarUsuario();
  }, [router]);

  const bmi = useMemo(() => {
    const p = Number(peso);
    const a = Number(altura);
    if (!Number.isFinite(p) || !Number.isFinite(a) || p <= 0 || a <= 0) return null;
    const value = p / (a * a);
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 10) / 10;
  }, [peso, altura]);

  const sair = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    router.push("/");
  };

  const salvarAlteracoes = async () => {
    const p = peso.trim() === "" ? undefined : Number(peso);
    const a = altura.trim() === "" ? undefined : Number(altura);

    if (p !== undefined && (!Number.isFinite(p) || p <= 0)) {
      toast.error("Peso inválido.");
      return;
    }
    if (a !== undefined && (!Number.isFinite(a) || a <= 0)) {
      toast.error("Altura inválida.");
      return;
    }

    setSalvando(true);
    try {
      const data = await patchPerfil({ peso: p, altura: a, fotoPerfil });

      if (data.id) {
        setUsuario(data);
        setPeso(metricaApiParaInput(data.peso));
        setAltura(metricaApiParaInput(data.altura));
        setFotoPerfil(data.fotoPerfil ?? null);
        toast.success("Alterações salvas!");
      } else {
        throw new Error(data.message || "Erro ao salvar alterações");
      }
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Erro ao salvar alterações.";
      toast.error(message);
    } finally {
      setSalvando(false);
    }
  };

  const handleFotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione apenas arquivos de imagem.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      if (!result) {
        toast.error("Não foi possível carregar a imagem.");
        return;
      }
      setFotoPerfil(result);
      toast.success("Foto carregada. Clique em salvar alterações.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  if (!usuario) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
        <p className="text-center text-white/80">Carregando...</p>
      </main>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-32 pt-4 sm:px-5 sm:pt-6">
      <div className="mb-8 flex items-center justify-between">
        <div className="h-10 w-10" />

        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full p-2 text-white/80 hover:text-white hover:bg-white/5 transition"
          aria-label="Voltar"
        >
          <ArrowBackIosNew fontSize="small" />
        </button>

        <div className="text-sm font-semibold tracking-wide text-green-400 sm:text-base">
          Profile
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`rounded-full p-2 transition ${
              showSettings ? "bg-white/10 text-white" : "text-white/50 hover:text-white hover:bg-white/5"
            }`}
            aria-label="Configurações"
          >
            <Settings fontSize="small" />
          </button>

          {showSettings && (
            <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#0f1830] shadow-2xl">
              <button
                onClick={handleRedefinirSenha}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/5 transition"
              >
                <LockReset fontSize="small" />
                Redefinir Senha
              </button>
              <button
                onClick={handleDesativarConta}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-400/5 transition"
              >
                <NoAccounts fontSize="small" />
                Desativar Conta
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          {/* ✅ "relative" adicionado para o fill do Image funcionar */}
          <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-[#0d162c] ring-[3px] ring-green-400/90 shadow-[0_0_0_6px_rgba(34,197,94,0.18)]">
            {fotoPerfil ? (
              // ✅ Substituído <img> pelo <Image /> do Next.js
              <Image
                src={fotoPerfil}
                alt="Foto de perfil"
                fill
                className="object-cover"
              />
            ) : (
              <Person className="text-white/70" sx={{ fontSize: 72 }} />
            )}
          </div>
          <label
            htmlFor="fotoPerfilInput"
            className="absolute bottom-1 right-0 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:brightness-110"
            aria-label="Editar foto"
            title="Editar foto"
          >
            <Edit fontSize="small" />
          </label>
          <input
            id="fotoPerfilInput"
            type="file"
            accept="image/*"
            onChange={handleFotoChange}
            className="hidden"
          />
        </div>

        <div className="mt-2 max-w-full truncate text-3xl font-extrabold tracking-tight sm:text-4xl">
          {usuario.nome}
        </div>
      </div>

      {/* Estatísticas */}
      <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-white/5 bg-[#111b34] p-5 shadow-sm">
          <div className="text-center text-[10px] tracking-[0.25em] text-white/35">Idade</div>
          <div className="mt-2 text-center text-4xl font-extrabold text-green-400 sm:text-5xl">
            {usuario.idade ?? "-"}
          </div>
          <div className="mt-1 text-center text-sm text-white/45">Anos</div>
        </div>

        <div className="rounded-3xl border border-white/5 bg-[#111b34] p-5 shadow-sm">
          <div className="text-center text-[10px] tracking-[0.25em] text-white/35">IMC</div>
          <div className="mt-2 text-center text-4xl font-extrabold text-cyan-300 sm:text-5xl">
            {bmi ?? "-"}
          </div>
        </div>
      </div>

      {/* Métricas Físicas */}
      <section className="mt-10 space-y-4">
        <div className="flex items-center justify-between gap-3 text-white/85">
          <span className="text-2xl font-semibold tracking-tight sm:text-4xl">Métricas Físicas</span>
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-green-400/20 bg-green-400/15 text-green-300">
            <Settings fontSize="small" />
          </span>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-[#1a2339] px-5 py-4">
            <div className="text-[11px] tracking-[0.25em] text-white/40">PESO (KG)</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <input
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                inputMode="decimal"
                className="w-full bg-transparent text-3xl font-semibold leading-none text-white/90 outline-none sm:text-[38px]"
                placeholder="—"
              />
              <div className="text-xl text-white/30">↔</div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#1a2339] px-5 py-4">
            <div className="text-[11px] tracking-[0.25em] text-white/40">ALTURA (M)</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <input
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                inputMode="decimal"
                className="w-full bg-transparent text-3xl font-semibold leading-none text-white/90 outline-none sm:text-[38px]"
                placeholder="—"
              />
              <div className="text-xl text-white/30">↕</div>
            </div>
          </div>
        </div>
      </section>

      {/* Ações */}
      <div className="mt-10 space-y-4">
        <button
          type="button"
          onClick={salvarAlteracoes}
          disabled={salvando}
          className="w-full rounded-[32px] bg-blue-600 py-5 text-lg font-extrabold tracking-wide shadow-[0_18px_40px_rgba(37,99,235,0.45)] transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {salvando ? "SAVING..." : "SALVAR ALTERAÇÕES"}
        </button>

        <button
          type="button"
          onClick={sair}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/5 bg-[#101a30] py-4 font-semibold text-white/85 transition hover:bg-white/5"
        >
          <Logout fontSize="small" className="text-orange-400" />
          LOGOUT
        </button>
      </div>

      {/* Modal Redefinir Senha */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[32px] bg-slate-950 p-8 border border-white/10 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="h-16 w-16 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                <LockReset sx={{ fontSize: 32 }} />
              </div>
              <h3 className="text-xl font-bold">Redefinir Senha</h3>
              <p className="text-sm text-white/50">Crie uma nova senha de acesso.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] tracking-widest text-white/40 uppercase ml-1">Nova Senha</label>
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 p-4 text-white ring-1 ring-white/10 focus:ring-blue-500 outline-none transition"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] tracking-widest text-white/40 uppercase ml-1">Confirmar Senha</label>
                <input
                  type="password"
                  placeholder="Repita a senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full rounded-2xl bg-white/5 p-4 text-white ring-1 ring-white/10 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setNovaSenha("");
                  setConfirmarSenha("");
                }}
                className="flex-1 rounded-2xl bg-white/5 py-4 text-sm font-semibold hover:bg-white/10 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarRedefinirSenha}
                className="flex-1 rounded-2xl bg-blue-600 py-4 text-sm font-bold text-white hover:bg-blue-500 transition shadow-[0_10px_20px_rgba(37,99,235,0.2)]"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}