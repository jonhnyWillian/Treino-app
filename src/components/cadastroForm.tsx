"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { googleLogin } from "@/services/api";

type FormErrors = {
  nome?: string;
  email?: string;
  senha?: string;
};
export default function CadastroForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    nome: "",
    idade: "",
    sexo: "",
    email: "",
    telefone: "",
    senha: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const newErrors: FormErrors = {};

    if (!form.nome) newErrors.nome = "Nome é obrigatório";
    if (!form.email) newErrors.email = "Email é obrigatório";
    if (!form.senha) newErrors.senha = "Senha é obrigatória";
    if (form.senha.length < 6)
      newErrors.senha = "Mínimo 6 caracteres";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!aceitouTermos) {
      toast.error("Você precisa aceitar os Termos de Uso.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(
        "http://localhost:3001/users/cadastro",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, idade: Number(form.idade) }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "Erro ao cadastrar");
        return;
      }

      toast.success("Usuário cadastrado com sucesso!");
      setForm({
        nome: "",
        idade: "",
        sexo: "",
        email: "",
        telefone: "",
        senha: "",
      });
      setAceitouTermos(false);
      router.push("/");
    } catch {
      toast.error("Erro ao conectar com o servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginComGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const dados = await googleLogin(tokenResponse.access_token);

        if (dados.token) {
          localStorage.setItem("usuario", JSON.stringify(dados.usuario));
          localStorage.setItem("token", dados.token);
          toast.success("Bem-vindo com Google!");
          router.push("/perfil");
        } else {
          toast.error(dados.message || "Erro ao fazer login com Google");
        }
      } catch (error) {
        console.error(error);
        toast.error("Erro ao conectar com servidor");
      }
    },
    onError: () => {
      toast.error("Falha na autenticação com Google");
    },
  });

  const formatTelefone = (value: string) => {
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d{2})(\d)/, "($1) $2");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
    return value;
  };

  return (
    <div className="rounded-3xl bg-slate-900/40 border border-white/10 backdrop-blur-xl shadow-2xl px-6 py-7">
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] tracking-[0.35em] text-white/55 mb-2">
            NOME COMPLETO
          </label>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-950/35 border border-white/10 px-4 py-3">
            <input
              className="w-full bg-transparent outline-none text-white placeholder:text-white/25"
              placeholder="Ex: Arthur Morgan"
              value={form.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              autoComplete="name"
            />
          </div>
          {errors.nome ? (
            <div className="mt-2 text-xs text-red-300">{errors.nome}</div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] tracking-[0.35em] text-white/55 mb-2">
              IDADE
            </label>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-950/35 border border-white/10 px-4 py-3">
              <input
                className="w-full bg-transparent outline-none text-white placeholder:text-white/25"
                placeholder="28"
                value={form.idade}
                onChange={(e) =>
                  handleChange("idade", e.target.value.replace(/[^\d]/g, ""))
                }
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] tracking-[0.35em] text-white/55 mb-2">
              GENERO
            </label>
            <div className="relative flex items-center gap-3 rounded-2xl bg-slate-950/35 border border-white/10 px-4 py-3">
              <select
                className="w-full appearance-none bg-transparent outline-none text-white [&>option]:bg-slate-900 [&>option]:text-white"
                value={form.sexo}
                onChange={(e) => handleChange("sexo", e.target.value)}
                aria-label="Gênero"
              >
                <option value="">
                  Selecione
                </option>
                <option value="Masculino">
                  Masculino
                </option>
                <option value="Feminino">
                  Feminino
                </option>
              </select>
              <div className="pointer-events-none absolute right-4 text-white/55">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 10L12 15L17 10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[11px] tracking-[0.35em] text-white/55 mb-2">
            EMAIL PROFISSIONAL
          </label>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-950/35 border border-white/10 px-4 py-3">
            <input
              className="w-full bg-transparent outline-none text-white placeholder:text-white/25"
              placeholder="nome@email.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              inputMode="email"
              autoComplete="email"
            />
          </div>
          {errors.email ? (
            <div className="mt-2 text-xs text-red-300">{errors.email}</div>
          ) : null}
        </div>

        <div>
          <label className="block text-[11px] tracking-[0.35em] text-white/55 mb-2">
            TELEFONE
          </label>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-950/35 border border-white/10 px-4 py-3">
            <input
              className="w-full bg-transparent outline-none text-white placeholder:text-white/25"
              placeholder="(11) 99999-9999"
              value={form.telefone}
              onChange={(e) =>
                handleChange("telefone", formatTelefone(e.target.value))
              }
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] tracking-[0.35em] text-white/55 mb-2">
            SENHA
          </label>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-950/35 border border-white/10 px-4 py-3">
            <input
              className="w-full bg-transparent outline-none text-white placeholder:text-white/25"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={form.senha}
              onChange={(e) => handleChange("senha", e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="text-white/60 hover:text-white/80"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setShowPassword((v) => !v)}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 12C4.8 7.5 8.1 5 12 5C15.9 5 19.2 7.5 21 12C19.2 16.5 15.9 19 12 19C8.1 19 4.8 16.5 3 12Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12C15 13.6569 13.6569 15 12 15Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                {!showPassword ? (
                  <path
                    d="M4 4L20 20"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                ) : null}
              </svg>
            </button>
          </div>
          {errors.senha ? (
            <div className="mt-2 text-xs text-red-300">{errors.senha}</div>
          ) : null}
        </div>

        <div className="pt-1">
          <label className="flex items-start gap-3 text-xs text-white/55 leading-relaxed">
            <input
              type="checkbox"
              checked={aceitouTermos}
              onChange={(e) => setAceitouTermos(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent accent-emerald-400"
            />
            <span>
              Eu aceito os{" "}
              <button
                type="button"
                className="text-white/80 underline underline-offset-2 hover:text-white"
                onClick={() => alert("Termos de Uso (em breve)")}
              >
                Termos de Uso
              </button>{" "}
              e confirmo que li a{" "}
              <button
                type="button"
                className="text-white/80 underline underline-offset-2 hover:text-white"
                onClick={() => alert("Política de Privacidade (em breve)")}
              >
                Política de Privacidade
              </button>
              .
            </span>
          </label>
        </div>

        <button
          type="button"
          disabled={isSubmitting}
          className={[
            "w-full mt-2 rounded-2xl py-4 font-semibold tracking-[0.35em]",
            "bg-gradient-to-r from-emerald-500 to-emerald-300 text-black",
            "shadow-[0_18px_45px_rgba(16,185,129,0.25)]",
            "hover:from-emerald-400 hover:to-emerald-300 transition",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          ].join(" ")}
          onClick={handleSubmit}
        >
          {isSubmitting ? "CADASTRANDO..." : "CADASTRAR"}
        </button>

        <div className="pt-4">
          <div className="text-center text-xs tracking-[0.35em] text-white/35 mb-3">
            OU ENTRE COM
          </div>
          <button
            type="button"
            className="w-full rounded-2xl py-3 bg-slate-950/35 border border-white/10 text-white/80 hover:text-white flex items-center justify-center gap-3"
            onClick={() => loginComGoogle()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-xs font-semibold tracking-widest">
              GOOGLE
            </span>
          </button>
        </div>

        <div className="pt-2 text-center text-white/60 text-sm">
          Já possui uma conta?{" "}
          <button
            type="button"
            className="text-emerald-400 hover:text-emerald-300 font-semibold"
            onClick={() => router.push("/")}
          >
            Entrar agora
          </button>
        </div>
      </div>
    </div>
  );
}
