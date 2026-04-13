"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { googleLogin } from "@/services/api";

export default function HomePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const handleLogin = async () => {
    try {
      const resposta = await fetch("http://localhost:3001/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          senha,
        }),
      });

      let dados;

      try {
        dados = await resposta.json();
      } catch {
        dados = { message: "Erro no servidor (não retornou JSON)" };
      }

      if (resposta.ok) {
        localStorage.setItem("usuario", JSON.stringify(dados.usuario));
        localStorage.setItem("token", dados.token);

        toast.success("Bem-vindo de volta!");
        router.push("/perfil");
      } else {
        toast.error(dados.message || "Email ou senha inválidos");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao conectar com servidor");
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
    <div className="w-full px-4 pb-32 pt-6">
      <div className="w-full">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-full bg-slate-900/70 border border-white/10 backdrop-blur flex items-center justify-center shadow-lg">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-blue-400"
            >
              <path
                d="M6.5 9.5V14.5M17.5 9.5V14.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M5 10.5H4C3.44772 10.5 3 10.9477 3 11.5V12.5C3 13.0523 3.44772 13.5 4 13.5H5M19 10.5H20C20.5523 10.5 21 10.9477 21 11.5V12.5C21 13.0523 20.5523 13.5 20 13.5H19"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M7 12H17"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="mt-4 text-center">
            <div className="text-white text-3xl font-extrabold tracking-wide">
              TRAINING<span className="text-blue-400">.</span>
            </div>
            <div className="text-white/70 text-sm tracking-[0.25em] mt-1">
              WORKOUT APP
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-slate-900/55 border border-white/10 backdrop-blur-xl shadow-2xl px-6 py-7">
          <div className="space-y-4">
            <div>
              <label className="block text-xs tracking-[0.25em] text-white/60 mb-2">
                E-MAIL
              </label>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-950/40 border border-white/10 px-4 py-3">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white/55"
                >
                  <path
                    d="M4 7.5C4 6.67157 4.67157 6 5.5 6H18.5C19.3284 6 20 6.67157 20 7.5V16.5C20 17.3284 19.3284 18 18.5 18H5.5C4.67157 18 4 17.3284 4 16.5V7.5Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M6 8L12 12.5L18 8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  className="w-full bg-transparent outline-none text-white placeholder:text-white/35"
                  placeholder="nome@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  inputMode="email"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs tracking-[0.25em] text-white/60">
                  SENHA
                </label>
                <button
                  type="button"
                  className="text-[11px] tracking-[0.25em] text-blue-400 hover:text-blue-300"
                  onClick={() => router.push("/redefinirSenha")}
                >
                  ESQUECI MINHA SENHA
                </button>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-950/40 border border-white/10 px-4 py-3">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white/55"
                >
                  <path
                    d="M7.5 11V8.5C7.5 6.01472 9.51472 4 12 4C14.4853 4 16.5 6.01472 16.5 8.5V11"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M7 11H17C18.1046 11 19 11.8954 19 13V18C19 19.1046 18.1046 20 17 20H7C5.89543 20 5 19.1046 5 18V13C5 11.8954 5.89543 11 7 11Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                </svg>
                <input
                  className="w-full bg-transparent outline-none text-white placeholder:text-white/35"
                  type={mostrarSenha ? "text" : "password"}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="text-white/60 hover:text-white/80"
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setMostrarSenha((v) => !v)}
                >
                  {mostrarSenha ? (
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
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 4L20 20"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <path
                        d="M10.5 9.2C11 9.07 11.5 9 12 9C13.6569 9 15 10.3431 15 12C15 12.5 14.93 13 14.8 13.5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <path
                        d="M6.7 6.7C5.2 7.7 4 9.3 3 12C4.8 16.5 8.1 19 12 19C14.7 19 17.1 17.8 19.3 15.7"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <path
                        d="M9.2 14.8C9.07 14.3 9 13.8 9 13.3"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <path
                        d="M21 12C20.2 10 19.2 8.6 18 7.6"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              className="w-full mt-2 rounded-2xl py-3 text-white font-semibold tracking-widest bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-600/20"
              onClick={handleLogin}
            >
              ENTRAR
            </button>

            <div className="pt-2">
              <div className="text-center text-xs tracking-[0.25em] text-white/45 mb-3">
                OU ENTRAR COM
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
          </div>
        </div>

        <div className="mt-6 text-center text-white/60 text-sm">
          Não possui uma conta?{" "}
          <button
            type="button"
            className="text-blue-400 hover:text-blue-300 font-semibold"
            onClick={() => router.push("/cadastro")}
          >
            Criar conta
          </button>
        </div>
      </div>
    </div>
  );
}
