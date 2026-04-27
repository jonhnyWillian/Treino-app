"use client"; // Define que o componente roda no client (Next.js)

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowBackIosNew, Email, Send, LockReset } from "@mui/icons-material";
import toast from "react-hot-toast";
import { forgotPassword } from "@/services/api"; // Serviço de recuperação de senha

export default function EsqueciSenhaPage() {

  // Hook de navegação
  const router = useRouter();

  // Estado do campo de e-mail
  const [email, setEmail] = useState("");

  // Estado de loading (controle de requisição)
  const [loading, setLoading] = useState(false);

  // Função responsável por enviar solicitação de recuperação de senha
  const handleEnviar = async () => {

    // Validação básica do campo
    if (!email) {
      toast.error("Por favor, digite seu e-mail.");
      return;
    }

    try {
      setLoading(true); // Ativa loading para evitar múltiplos envios

      // Chamada da API
      const dados = await forgotPassword(email);

      // Verifica retorno da API
      if (dados.message) {

        // Feedback positivo para o usuário
        toast.success(dados.message || "Instruções enviadas com sucesso!");

        // Redireciona para login/home
        router.push("/");
      } else {
        toast.error(dados.message || "Erro ao processar solicitação.");
      }

    } catch (error) {
      console.error(error);

      // Tratamento de erro de conexão
      toast.error("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false); // Finaliza loading independentemente do resultado
    }
  };

  return (
    <div className="w-full px-4 pb-32 pt-6">
      <div className="w-full">

        {/* HEADER */}
        <div className="flex flex-col items-center mb-8">

          {/* Botão de voltar */}
          <button
            onClick={() => router.push("/")}
            className="self-start mb-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowBackIosNew sx={{ fontSize: 16 }} />
            <span className="text-xs tracking-[0.2em]">VOLTAR</span>
          </button>

          {/* Ícone principal (contexto visual da ação) */}
          <div className="h-16 w-16 rounded-full bg-slate-900/70 border border-white/10 backdrop-blur flex items-center justify-center shadow-lg mb-4">
            <LockReset sx={{ fontSize: 32, color: "#60a5fa" }} />
          </div>
          
          {/* Título e descrição */}
          <div className="text-center">
            <h1 className="text-white text-2xl font-extrabold tracking-tight">
              Recuperar Senha
            </h1>

            <p className="text-white/50 text-xs mt-2 leading-relaxed px-4">
              Digite seu e-mail abaixo para receber as instruções de redefinição.
            </p>
          </div>
        </div>

        {/* CARD PRINCIPAL */}
        <div className="rounded-[32px] bg-slate-900/55 border border-white/10 backdrop-blur-xl shadow-2xl px-6 py-8">
          <div className="space-y-6">

            {/* INPUT DE E-MAIL */}
            <div>
              <label className="block text-[10px] tracking-[0.3em] text-white/40 mb-3 ml-1 uppercase">
                Endereço de E-mail
              </label>

              {/* Campo com ícone */}
              <div className="flex items-center gap-3 rounded-2xl bg-slate-950/40 border border-white/10 px-4 py-4 focus-within:border-blue-400/50 transition-colors">
                <Email sx={{ fontSize: 20, color: "rgba(255,255,255,0.4)" }} />

                <input
                  className="w-full bg-transparent outline-none text-white placeholder:text-white/20 text-sm"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)} // Atualiza estado
                  disabled={loading} // Desabilita durante envio
                />
              </div>
            </div>

            {/* BOTÃO DE ENVIO */}
            <button
              className={`w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-500 py-4 text-sm font-bold tracking-widest text-white transition-all active:scale-[0.98] ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
              onClick={handleEnviar}
              disabled={loading}
            >

              {/* Estado loading */}
              {loading ? (
                // Spinner
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send sx={{ fontSize: 18 }} />
                  <span>ENVIAR INSTRUÇÕES</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RODAPÉ */}
        <div className="mt-8 text-center">
          <p className="text-white/30 text-[10px] tracking-widest leading-loose uppercase">
            Aplicativo de  Treino<br />
            © 2026 Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}