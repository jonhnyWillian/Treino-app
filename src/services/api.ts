const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Helper para fazer requisições autenticadas
async function authenticatedFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expirado ou inválido
    localStorage.removeItem("token");
    window.location.href = "/";
  }

  return response;
}

export async function login(email: string, senha: string) {
  const response = await fetch(`${API_URL}/users/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, senha }),
  });
  return response.json();
}

export async function googleLogin(token: string) {
  const response = await fetch(`${API_URL}/users/google-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });
  return response.json();
}

export async function finalizarTreino(treino: { 
  tipo: string; 
  diaSemana: string; 
  exerciciosRealizados: { nome: string; series?: number; repeticoes?: string | number }[] 
}) {
  const response = await authenticatedFetch("/workouts/finalizar", {
    method: "POST",
    body: JSON.stringify(treino),
  });
  return response.json();
}

export async function listarTreinos() {
  const response = await authenticatedFetch("/workouts/listar");
  return response.json();
}

export async function salvarHistorico(treinoId: number) {
  const response = await authenticatedFetch("/workouts/historico/salvar", {
    method: "POST",
    body: JSON.stringify({ treinoId }),
  });
  return response.json();
}

export async function listarHistorico() {
  const response = await authenticatedFetch("/workouts/historico/listar");
  return response.json();
}

export async function desativarConta() {
  const response = await authenticatedFetch("/users/desativar", {
    method: "POST",
  });
  return response.json();
}

export async function redefinirSenhaLogado(novaSenha: string) {
  const response = await authenticatedFetch("/users/redefinir-senha-logado", {
    method: "POST",
    body: JSON.stringify({ novaSenha }),
  });
  return response.json();
}

export async function getPerfil() {
  const response = await authenticatedFetch("/users/perfil");
  return response.json();
}
