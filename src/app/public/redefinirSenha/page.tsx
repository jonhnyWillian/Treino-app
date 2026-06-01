"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { forgotPassword } from "@/services/api";

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleEnviar = async () => {
    if (!email) {
      toast.error("Por favor, digite seu e-mail.");
      return;
    }
    try {
      setLoading(true);
      const dados = await forgotPassword(email);
      if (dados.message) {
        toast.success(dados.message || "Instruções enviadas com sucesso!");
        setEnviado(true);
      } else {
        toast.error(dados.message || "Erro ao processar solicitação.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0f172a]">

      {/* ── LADO ESQUERDO — marketing ── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] sticky top-0 h-screen flex-col justify-between p-12 bg-[#090f1c] border-r border-white/5 overflow-hidden">
        {/* Grid decorativo */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M6.5 9.5V14.5M17.5 9.5V14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M5 10.5H4C3.45 10.5 3 10.95 3 11.5V12.5C3 13.05 3.45 13.5 4 13.5H5M19 10.5H20C20.55 10.5 21 10.95 21 11.5V12.5C21 13.05 20.55 13.5 20 13.5H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M7 12H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-white font-black tracking-tight text-xl">TrainUp</span>
        </div>

        {/* Copy */}
        <div className="relative space-y-4 max-w-md">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-blue-400">
              <path d="M12 2L8 6H4V10L2 12L4 14V18H8L12 22L16 18H20V14L22 12L20 10V6H16L12 2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-5xl font-black tracking-tight text-white leading-[1.1]">
            Sem<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              problemas,
            </span><br />
            acontece.
          </h2>
          <p className="text-white/40 text-lg leading-relaxed">
            Informe seu e-mail e enviaremos as instruções para você criar uma nova senha rapidinho.
          </p>
        </div>

        <p className="relative text-xs text-white/20">
          © {new Date().getFullYear()} TrainUpApp — Todos os direitos reservados
        </p>
      </div>

      {/* ── LADO DIREITO — formulário ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M6.5 9.5V14.5M17.5 9.5V14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M7 12H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-white font-black tracking-tight text-xl">TrainUp</span>
          </div>

          {!enviado ? (
            <>
              {/* Título */}
              <div>
                <h1 className="text-2xl font-bold text-white">Recuperar senha</h1>
                <p className="text-white/40 text-sm mt-1">
                  Informe seu e-mail para receber as instruções
                </p>
              </div>

              {/* Campo e-mail */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                    E-mail
                  </label>
                  <input
                    className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition disabled:opacity-50"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleEnviar()}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <button
                  onClick={handleEnviar}
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Enviar instruções"
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Estado de sucesso */
            <div className="space-y-6 text-center">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-emerald-400">
                  <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">E-mail enviado!</h2>
                <p className="text-white/40 text-sm mt-2 leading-relaxed">
                  Verifique sua caixa de entrada em <span className="text-white/70">{email}</span> e siga as instruções.
                </p>
              </div>
            </div>
          )}

          {/* Voltar ao login */}
          <p className="text-center text-sm text-white/40">
            <button
              onClick={() => router.push("/")}
              className="font-semibold text-blue-400 hover:text-blue-300 transition"
            >
              ← Voltar ao login
            </button>
          </p>

        </div>
      </div>
    </div>
  );
}