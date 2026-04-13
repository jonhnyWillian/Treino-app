"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowBackIosNew,
  Edit,
  Logout,
  Person,
  Settings,
  LockReset,
  NoAccounts,
} from "@mui/icons-material";
import { desativarConta, redefinirSenhaLogado } from "@/services/api";
import toast from "react-hot-toast";

type Usuario = {
  id: number;
  nome: string;
  email: string;
  idade?: number;
  peso?: number;
  altura?: number;
};

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
    const token = localStorage.getItem("token");

    const buscarUsuario = async () => {
      if (!token) return;
      try {

        const response = await fetch("http://localhost:3001/users/perfil", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error("Erro ao buscar perfil");
        }

        const data: Usuario = await response.json();
        setUsuario(data);
        setPeso(typeof data.peso === "number" ? String(data.peso) : "");
        setAltura(typeof data.altura === "number" ? String(data.altura) : "");

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
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

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
      const response = await fetch("http://localhost:3001/users/perfil", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          peso: p,
          altura: a,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro ao salvar alterações");
      }

      const data: Usuario = await response.json();
      setUsuario(data);
      setPeso(typeof data.peso === "number" ? String(data.peso) : "");
      setAltura(typeof data.altura === "number" ? String(data.altura) : "");
      toast.success("Alterações salvas!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar alterações.");
    } finally {
      setSalvando(false);
    }
  };

  if (!usuario) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
        <p className="text-center text-white/80">Carregando...</p>
      </main>
    );
  }

  return (
    <div className="w-full px-5 pb-32 pt-6">
      <div className="flex items-center justify-between mb-8">
        <div className="lg:hidden w-10 h-10" /> {/* Espaçador para o botão de menu fixo no mobile */}

        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full p-2 text-white/80 hover:text-white hover:bg-white/5 transition"
          aria-label="Voltar"
        >
          <ArrowBackIosNew fontSize="small" />
        </button>

        <div className="text-green-400 font-extrabold tracking-wider">
          PERFIL
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
            <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 overflow-hidden">
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
          <div className="h-28 w-28 rounded-full bg-slate-900/60 ring-2 ring-slate-700 flex items-center justify-center shadow-[0_0_0_8px_rgba(16,185,129,0.06)]">
            <Person className="text-white/70" sx={{ fontSize: 72 }} />
          </div>
          <button
            type="button"
            className="absolute bottom-1 right-1 h-9 w-9 rounded-full bg-green-400 text-slate-950 flex items-center justify-center shadow-lg hover:brightness-110 transition"
            aria-label="Editar foto"
          >
            <Edit fontSize="small" />
          </button>
        </div>

        <div className="text-3xl font-extrabold">{usuario.nome}</div>
        <div className="text-white/50 text-sm">{usuario.email}</div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-5 shadow-sm">
          <div className="text-4xl font-extrabold text-green-400 text-center">
            {usuario.idade ?? "-"}
          </div>
          <div className="mt-1 text-[11px] tracking-[0.25em] text-white/40 text-center">
            IDADE
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/40 border border-slate-800 p-5 shadow-sm">
          <div className="text-4xl font-extrabold text-green-400 text-center">
            {bmi ?? "-"}
          </div>
          <div className="mt-1 text-[11px] tracking-[0.25em] text-white/40 text-center">
            ÍNDICE DE IMC
          </div>
        </div>
      </div>

      {/* Physical Metrics */}
      <section className="mt-8 rounded-3xl bg-slate-900/35 border border-slate-800 p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-white/80 font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-green-400/15 text-green-300 border border-green-400/20">
            <Settings fontSize="small" />
          </span>
          <span>Métricas Físicas</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-950/40 border border-slate-800 px-4 py-3">
            <div className="text-[10px] tracking-[0.25em] text-white/40">
              PESO (KG)
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <input
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                inputMode="decimal"
                className="w-full bg-transparent text-white/90 text-lg outline-none"
                placeholder="—"
              />
              <div className="text-green-300 font-semibold">kg</div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950/40 border border-slate-800 px-4 py-3">
            <div className="text-[10px] tracking-[0.25em] text-white/40">
              ALTURA (M)
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <input
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
                inputMode="decimal"
                className="w-full bg-transparent text-white/90 text-lg outline-none"
                placeholder="—"
              />
              <div className="text-green-300 font-semibold">m</div>
            </div>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="mt-8 space-y-4">
        <button
          type="button"
          onClick={salvarAlteracoes}
          disabled={salvando}
          className="w-full rounded-2xl py-4 font-extrabold tracking-wide bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-[0_10px_30px_rgba(37,99,235,0.25)]"
        >
          {salvando ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
        </button>

        <button
          type="button"
          onClick={sair}
          className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 transition font-semibold"
        >
          <Logout fontSize="small" />
          SAIR DA CONTA
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