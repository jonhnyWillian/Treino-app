"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { getPerfil } from "@/services/api";

interface Usuario {
  id: number;
  nome: string;
  email: string;
  sexo?: string;
  fotoPerfil?: string | null;
  role?: "admin" | "cliente";
}

interface AuthContextType {
  usuario: Usuario | null;
  setUsuario: (u: Usuario | null) => void;
  carregando: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Lê o cache fora do componente — executado só no cliente, nunca no servidor.
// Retorna null no servidor (typeof window === "undefined").
function lerCacheInicial(): Usuario | null {
  if (typeof window === "undefined") return null;
  try {
    const cache = sessionStorage.getItem("usuario_cache");
    return cache ? JSON.parse(cache) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Inicialização lazy — a função só roda no cliente, nunca no servidor.
  // Isso evita hydration mismatch E não precisa de useEffect para restaurar cache.
  const [usuario, setUsuarioState] = useState<Usuario | null>(lerCacheInicial);
  const [carregando, setCarregando] = useState(() => lerCacheInicial() === null);
  const [montado, setMontado] = useState(false);

  const setUsuario = (u: Usuario | null) => {
    setUsuarioState(u);
    if (typeof window !== "undefined") {
      if (u) sessionStorage.setItem("usuario_cache", JSON.stringify(u));
      else sessionStorage.removeItem("usuario_cache");
    }
  };

  // Único useEffect — só chama async, nunca setState síncrono no corpo.
  // setMontado e os setState do getPerfil acontecem em callbacks assíncronos.
  useEffect(() => {
    let cancelado = false;

    // Marca hidratação completa — via callback para não ser síncrono
    Promise.resolve().then(() => {
      if (!cancelado) setMontado(true);
    });

    getPerfil()
      .then((dados) => {
        if (cancelado) return;
        if (dados?.id) setUsuario(dados);
        else setUsuario(null);
      })
      .catch(() => {
        if (!cancelado) setUsuario(null);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => { cancelado = true; };
  }, []);

  return (
    <AuthContext.Provider value={{
      // Antes de montar, expõe null/true para servidor e cliente renderizarem igual
      usuario: montado ? usuario : null,
      setUsuario,
      carregando: montado ? carregando : true,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}