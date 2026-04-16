"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { cadastro, googleLogin } from "@/services/api";

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

  const formatTelefone = (value: string) => {
    value = value.replace(/\D/g, "");
    value = value.replace(/(\d{2})(\d)/, "($1) $2");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
    return value;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!aceitouTermos) {
      toast.error("Você precisa aceitar os Termos de Uso.");
      return;
    }

    try {
      setIsSubmitting(true);
      const data = await cadastro({ ...form, idade: Number(form.idade) });

      if (data.id) {
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
      } else {
        toast.error(data.message || "Erro ao cadastrar");
      }
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

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold tracking-[0.2em] text-white/40 mb-3 ml-1 uppercase">
            NOME COMPLETO
          </label>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-950/40 border border-white/10 px-4 py-4 focus-within:border-emerald-400/50 focus-within:ring-4 focus-within:ring-emerald-400/10 transition-all duration-300">
            <input
              className="w-full bg-transparent outline-none text-white placeholder:text-white/25"
              placeholder="Ex: Arthur Morgan"
              value={form.nome}
              onChange={(e) => handleChange("nome", e.target.value)}
              autoComplete="name"
            />
          </div>
          {errors.nome && (
            <div className="mt-2 text-[10px] font-bold text-red-400 ml-1 uppercase">{errors.nome}</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold tracking-[0.2em] text-white/40 mb-3 ml-1 uppercase">
              IDADE
            </label>
            <div className="flex items-center gap-3 rounded-2xl bg-slate-950/40 border border-white/10 px-4 py-4 focus-within:border-emerald-400/50 focus-within:ring-4 focus-within:ring-emerald-400/10 transition-all duration-300">
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
            <label className="block text-[10px] font-bold tracking-[0.2em] text-white/40 mb-3 ml-1 uppercase">
              GÊNERO
            </label>
            <div className="relative flex items-center gap-3 rounded-2xl bg-slate-950/40 border border-white/10 px-4 py-4 focus-within:border-emerald-400/50 focus-within:ring-4 focus-within:ring-emerald-400/10 transition-all duration-300">
              <select
                className="w-full appearance-none bg-transparent outline-none text-white [&>option]:bg-slate-900 [&>option]:text-white"
                value={form.sexo}
                onChange={(e) => handleChange("sexo", e.target.value)}
                aria-label="Gênero"
              >
                <option value="">Selecione</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
              </select>
              <div className="pointer-events-none absolute right-4 text-white/20">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-[0.2em] text-white/40 mb-3 ml-1 uppercase">
            E-MAIL
          </label>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-950/40 border border-white/10 px-4 py-4 focus-within:border-emerald-400/50 focus-within:ring-4 focus-within:ring-emerald-400/10 transition-all duration-300">
            <input
              className="w-full bg-transparent outline-none text-white placeholder:text-white/25"
              placeholder="nome@email.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              inputMode="email"
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <div className="mt-2 text-[10px] font-bold text-red-400 ml-1 uppercase">{errors.email}</div>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-bold tracking-[0.2em] text-white/40 mb-3 ml-1 uppercase">
            TELEFONE
          </label>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-950/40 border border-white/10 px-4 py-4 focus-within:border-emerald-400/50 focus-within:ring-4 focus-within:ring-emerald-400/10 transition-all duration-300">
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
          <label className="block text-[10px] font-bold tracking-[0.2em] text-white/40 mb-3 ml-1 uppercase">
            SENHA
          </label>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-950/40 border border-white/10 px-4 py-4 focus-within:border-emerald-400/50 focus-within:ring-4 focus-within:ring-emerald-400/10 transition-all duration-300">
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
              className="text-white/40 hover:text-white/80 transition"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 12C4.8 7.5 8.1 5 12 5C15.9 5 19.2 7.5 21 12C19.2 16.5 15.9 19 12 19C8.1 19 4.8 16.5 3 12Z" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12C15 13.6569 13.6569 15 12 15Z" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4L20 20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M10.5 9.2C11 9.07 11.5 9 12 9C13.6569 9 15 10.3431 15 12C15 12.5 14.93 13 14.8 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M6.7 6.7C5.2 7.7 4 9.3 3 12C4.8 16.5 8.1 19 12 19C14.7 19 17.1 17.8 19.3 15.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M9.2 14.8C9.07 14.3 9 13.8 9 13.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M21 12C20.2 10 19.2 8.6 18 7.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
          {errors.senha && (
            <div className="mt-2 text-[10px] font-bold text-red-400 ml-1 uppercase">{errors.senha}</div>
          )}
        </div>
      </div>

      <div className="pt-2">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={aceitouTermos}
              onChange={(e) => setAceitouTermos(e.target.checked)}
            />
            <div className="h-5 w-5 rounded-md border-2 border-white/10 bg-white/5 transition-all peer-checked:border-emerald-500 peer-checked:bg-emerald-500"></div>
            <svg
              className="absolute inset-0 h-5 w-5 scale-0 text-slate-950 transition-transform peer-checked:scale-100"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className="text-[11px] font-medium text-white/40 group-hover:text-white/60 transition">
            Li e aceito os <button type="button" className="text-emerald-400 font-bold hover:underline">Termos de Uso</button> e a <button type="button" className="text-emerald-400 font-bold hover:underline">Política de Privacidade</button>
          </span>
        </label>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full relative group overflow-hidden rounded-2xl bg-emerald-500 py-4 font-bold tracking-widest text-slate-950 transition-all hover:bg-emerald-400 active:scale-[0.98] shadow-[0_10px_30px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="absolute inset-0 flex items-center justify-center bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        <span className="relative text-sm uppercase">{isSubmitting ? "CADASTRANDO..." : "CRIAR MINHA CONTA"}</span>
      </button>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/5"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#0b1220] px-3 text-[10px] font-bold tracking-widest text-white/20 uppercase">
            Ou se preferir
          </span>
        </div>
      </div>

      <button
        onClick={() => loginComGoogle()}
        className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white/5 border border-white/10 py-4 text-sm font-bold text-white hover:bg-white/10 transition active:scale-[0.98]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        GOOGLE
      </button>

      <div className="pt-4 text-center">
        <p className="text-sm text-white/40">
          Já possui uma conta?{" "}
          <button
            onClick={() => router.push("/")}
            className="font-bold text-emerald-400 hover:text-emerald-300 transition underline decoration-emerald-400/20 underline-offset-8"
          >
            Entrar agora
          </button>
        </p>
      </div>
    </div>
  );
}
