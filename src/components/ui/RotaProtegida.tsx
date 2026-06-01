"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

interface RotaProtegidaProps {
  children: React.ReactNode;
  // Se definido, apenas usuários com esse role podem acessar.
  // Se omitido, qualquer usuário autenticado pode acessar.
  role?: "admin" | "cliente";
}

/**
 * Protege rotas autenticadas e opcionalmente restringe por role.
 *
 * Fluxo:
 * - Enquanto carregando → não renderiza nada (evita flash de redirect)
 * - Sem usuário → redireciona para /
 * - Com role definido e role incorreto → redireciona para área correta
 * - OK → renderiza children
 */
export default function RotaProtegida({ children, role }: RotaProtegidaProps) {
  const { usuario, carregando } = useAuth();
  const router = useRouter();
  const redirecionou = useRef(false);

  useEffect(() => {
    if (carregando) return;
    if (redirecionou.current) return;

    // Sem sessão — vai para login
    if (!usuario) {
      redirecionou.current = true;
      router.push("/");
      return;
    }

    // Role errado — redireciona para a área correta
    if (role && usuario.role !== role) {
      redirecionou.current = true;
      router.push(usuario.role === "admin" ? "/admin/dashboard" : "/cliente/dashboard");
      return;
    }
  }, [usuario, carregando, role, router]);

  // Aguarda verificação do cookie
  if (carregando) return null;

  // Sem usuário ou role errado — não renderiza nada enquanto redireciona
  if (!usuario) return null;
  if (role && usuario.role !== role) return null;

  return <>{children}</>;
}