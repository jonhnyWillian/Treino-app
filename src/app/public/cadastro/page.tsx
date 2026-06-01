"use client";

import CadastroForm from "@/components/cadastroForm";
import { useRouter } from "next/navigation";

export default function CadastroPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex bg-[#0f172a]">

      {/* ── LADO ESQUERDO — marketing ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[48%] relative flex-col justify-between p-12 bg-[#090f1c] border-r border-white/5 overflow-hidden">
        {/* Grid decorativo */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M6.5 9.5V14.5M17.5 9.5V14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M5 10.5H4C3.45 10.5 3 10.95 3 11.5V12.5C3 13.05 3.45 13.5 4 13.5H5M19 10.5H20C20.55 10.5 21 10.95 21 11.5V12.5C21 13.05 20.55 13.5 20 13.5H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M7 12H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-white font-black tracking-tight text-xl">
            TrainUp<span className="text-emerald-400"></span>
          </span>
        </div>

        {/* Hero copy */}
        <div className="relative space-y-6 max-w-md">
          <h2 className="text-5xl font-black tracking-tight text-white leading-[1.1]">
            Comece sua<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 italic">
              jornada
            </span><br />
            hoje.
          </h2>
          <p className="text-white/40 text-lg leading-relaxed">
            Crie sua conta em menos de 1 minuto e comece a registrar seus treinos agora mesmo.
          </p>

          {/* Benefícios */}
          <ul className="space-y-3 pt-2">
            {[
              "Histórico completo de treinos",
              "Acompanhe peso, altura e IMC",
              "Streak de dias consecutivos",
              "Compartilhe sua evolução",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-white/60">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/20">
          © {new Date().getFullYear()} TrainUpApp — Todos os direitos reservados
        </p>
      </div>

      {/* ── LADO DIREITO — formulário ── */}
      <div className="flex-1 flex justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm py-8">

          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M6.5 9.5V14.5M17.5 9.5V14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M7 12H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-white font-black tracking-tight text-xl">
              TrainUp<span className="text-emerald-400">APP</span>
            </span>
          </div>

          {/* Título */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">Criar conta</h1>
            <p className="text-white/40 text-sm mt-1">Preencha os dados para começar</p>
          </div>

          {/* Formulário */}
          <CadastroForm />

          {/* Link voltar ao login */}
          <p className="text-center text-sm text-white/40 mt-6">
            Já tem uma conta?{" "}
            <button
              type="button"
              onClick={() => router.push("/")}
              className="font-semibold text-blue-400 hover:text-blue-300 transition"
            >
              Entrar
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}