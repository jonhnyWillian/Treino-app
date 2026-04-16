"use client";

import CadastroForm from "@/components/cadastroForm";
import { useRouter } from "next/navigation";

export default function CadastroPage() {
  const router = useRouter();

  return (
    <div className="w-full px-4 pb-32 pt-12 flex flex-col items-center">
      <div className="w-full max-w-[440px]">
        <div className="relative mb-10 flex items-center justify-center">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Voltar"
            className="absolute left-0 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/75 hover:bg-white/10 hover:text-white transition-all active:scale-95"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="text-xl font-black tracking-tighter text-emerald-400">
            WORKOUT<span className="text-white/20">APP</span>
          </div>
        </div>

        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black leading-tight tracking-tight text-white">
            Comece sua <span className="text-emerald-400 italic">jornada</span>.
          </h1>
          <p className="mt-3 text-sm font-medium leading-relaxed text-white/40 max-w-[280px] mx-auto">
            Junte-se à comunidade de alta performance e alcance seus objetivos.
          </p>
        </div>

        <div className="rounded-[32px] bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl p-8">
          <CadastroForm />
        </div>
      </div>
    </div>
  );
}