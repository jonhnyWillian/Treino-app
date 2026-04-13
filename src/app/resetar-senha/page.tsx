"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Visibility, VisibilityOff, CheckCircle } from "@mui/icons-material";
import toast from "react-hot-toast";

function ResetarSenhaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Token de redefinição ausente.");
      router.push("/");
    }
  }, [token, router]);

  const handleReset = async () => {
    if (!novaSenha || novaSenha.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }

    try {
      setLoading(true);
      const resposta = await fetch("http://localhost:3001/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha })
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        setSucesso(true);
        toast.success("Senha redefinida com sucesso!");
        setTimeout(() => router.push("/"), 3000);
      } else {
        toast.error(dados.message || "Erro ao redefinir senha.");
      }
    } catch {
      toast.error("Erro na conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#050812] px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="h-20 w-20 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
            <CheckCircle sx={{ fontSize: 40 }} />
          </div>
          <h1 className="text-white text-2xl font-bold">Tudo pronto!</h1>
          <p className="text-white/50 text-sm">Sua senha foi atualizada. Você será redirecionado para o login em instantes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 pb-32 pt-6">
      <div className="w-full">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-full bg-slate-900/70 border border-white/10 backdrop-blur flex items-center justify-center shadow-lg mb-4">
            <Lock sx={{ fontSize: 32, color: "#3b82f6" }} />
          </div>
          
          <div className="text-center">
            <h1 className="text-white text-2xl font-extrabold tracking-tight">Nova Senha</h1>
            <p className="text-white/50 text-xs mt-2 leading-relaxed px-4">
              Crie uma senha forte para proteger sua conta.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-[32px] bg-slate-900/55 border border-white/10 backdrop-blur-xl shadow-2xl px-6 py-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-[0.3em] text-white/40 mb-3 ml-1 uppercase">Nova Senha</label>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-950/40 border border-white/10 px-4 py-4 focus-within:border-blue-400/50 transition-colors">
                <input
                  className="w-full bg-transparent outline-none text-white placeholder:text-white/20 text-sm"
                  type={showSenha ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                />
                <button onClick={() => setShowSenha(!showSenha)} className="text-white/30 hover:text-white/60">
                  {showSenha ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] tracking-[0.3em] text-white/40 mb-3 ml-1 uppercase">Confirmar Senha</label>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-950/40 border border-white/10 px-4 py-4 focus-within:border-blue-400/50 transition-colors">
                <input
                  className="w-full bg-transparent outline-none text-white placeholder:text-white/20 text-sm"
                  type={showSenha ? "text" : "password"}
                  placeholder="Repita a nova senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            className={`w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-bold tracking-widest text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:bg-blue-500 transition-all active:scale-[0.98] ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
            onClick={handleReset}
            disabled={loading}
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>ATUALIZAR SENHA</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetarSenhaPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    }>
      <ResetarSenhaContent />
    </Suspense>
  );
}
