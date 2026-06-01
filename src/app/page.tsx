"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import toast from "react-hot-toast";
import { login } from "@/services/api";

const INPUT_CLS =
  "w-full h-11 rounded-xl border border-white/10 bg-white/5 px-4 " +
  "text-sm text-white placeholder:text-white/30 outline-none " +
  "focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition";

function DumbbellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
      <path d="M6.5 9.5V14.5M17.5 9.5V14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M5 10.5H4C3.45 10.5 3 10.95 3 11.5V12.5C3 13.05 3.45 13.5 4 13.5H5M19 10.5H20C20.55 10.5 21 10.95 21 11.5V12.5C21 13.05 20.55 13.5 20 13.5H19"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M7 12H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 12C4.8 7.5 8.1 5 12 5C15.9 5 19.2 7.5 21 12C19.2 16.5 15.9 19 12 19C8.1 19 4.8 16.5 3 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 4L20 20M10.5 9.2C11 9.07 11.5 9 12 9C13.66 9 15 10.34 15 12C15 12.5 14.93 13 14.8 13.5M6.7 6.7C5.2 7.7 4 9.3 3 12C4.8 16.5 8.1 19 12 19C14.7 19 17.1 17.8 19.3 15.7M9.2 14.8C9.07 14.3 9 13.8 9 13.3M21 12C20.2 10 19.2 8.6 18 7.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center">
        <DumbbellIcon />
      </div>
      <span className="text-white font-black tracking-tight text-xl">TrainUp</span>
    </div>
  );
}

function MarketingSide() {
  return (
    <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col justify-between p-12 bg-[#090f1c] border-r border-white/5 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/5 blur-3xl" />

      <Logo className="relative" />

      <div className="relative space-y-6 max-w-md">
        <h2 className="text-5xl font-black tracking-tight text-white leading-[1.1]">
          Sua melhor<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            versão começa
          </span>
          <br />
          aqui.
        </h2>
        <p className="text-white/40 text-lg leading-relaxed">
          Registre treinos, acompanhe evolução e quebre seus recordes todos os dias.
        </p>
      </div>

      <p className="relative text-xs text-white/20">
        © {new Date().getFullYear()} TrainUpApp — Todos os direitos reservados
      </p>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { setUsuario } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async () => {
    if (carregando) return;
    setCarregando(true);
    try {
      const dados = await login(email, senha);

      if (dados.usuario) {
        setUsuario(dados.usuario);
        toast.success("Bem-vindo de volta!");

        if (dados.usuario.role === "admin") {
          router.push("/admin/dashboard");
        } else {
          router.push("/cliente/dashboard");
        }
      } else {
        toast.error(dados.message || "Email ou senha inválidos");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao conectar com servidor");
    } finally {
      setCarregando(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen flex bg-[#0f172a]">
      <MarketingSide />

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          <Logo className="lg:hidden" />

          <h1 className="text-2xl font-bold text-white">Entrar na conta</h1>

          <div className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                Email
              </label>
              <input
                className={INPUT_CLS}
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                inputMode="email"
                autoComplete="email"
              />
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white/50 uppercase tracking-widest">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={() => router.push("public/redefinirSenha")}
                  className="text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <input
                  className={`${INPUT_CLS} pr-11`}
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  onKeyDown={handleKeyDown}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? <EyeIcon /> : <EyeOffIcon />}
                </button>
              </div>
            </div>

            <button
              onClick={handleLogin}
              disabled={carregando}
              className="w-full h-11 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </div>

          <p className="text-center text-sm text-white/40">
            Não tem uma conta?{" "}
            <button
              onClick={() => router.push("public/cadastro")}
              className="font-semibold text-emerald-400 hover:text-emerald-300 transition"
            >
              Cadastre-se grátis
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}