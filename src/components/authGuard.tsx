"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = ["/", "/cadastro", "/redefinirSenha", "/resetar-senha"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter(); // Hook para navegação entre páginas
  const pathname = usePathname(); // Hook para pegar a rota atual
  const [authorized, setAuthorized] = useState(false); // Estado que controla se o usuário está autorizado

  useEffect(() => {
    // Função que verifica se o usuário está autenticado
    const checkAuth = () => {
      const token = localStorage.getItem("token"); // Pega o token do localStorage
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname); // Verifica se a rota atual é pública

      // Se não tem token e a rota não é pública → redireciona para a home
      if (!token && !isPublicRoute) {
        setAuthorized(false);
        router.replace("/");
      } else {
        // Caso tenha token ou seja rota pública → permite acesso
        setAuthorized(true);
      }
    };

    checkAuth(); // Executa a verificação ao montar o componente ou mudar a rota
  }, [pathname, router]);

  // Enquanto não está autorizado e não é rota pública, mostra um loader
  if (!authorized && !PUBLIC_ROUTES.includes(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        {/* Spinner de carregamento */}
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // Se autorizado, renderiza o conteúdo da página
  return <>{children}</>;
}