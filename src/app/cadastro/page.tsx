"use client";

import CadastroForm from "@/components/cadastroForm";
import { useRouter } from "next/navigation";

export default function CadastroPage() {
  const router = useRouter();

  return (
    <div className="w-full px-4 pb-32 pt-6">
      <div className="relative mb-6 flex items-center justify-center">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Voltar"
          className="absolute left-0 inline-flex h-10 w-10 items-center justify-center rounded-2xl text-white/75 hover:bg-white/5 hover:text-white"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="text-center font-extrabold tracking-wide text-emerald-400">
            KINETIC
          </div>
        </div>

        <div className="mb-6"><h1 className="text-[34px] font-extrabold leading-tight tracking-tight">
          Comece sua <span className="text-emerald-400 italic">jornada</span>.
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/55">
          Junte-se ao atelier de performance mais exclusivo do mundo digital.
        </p>
      </div>

      <CadastroForm />
    </div>
  );
}