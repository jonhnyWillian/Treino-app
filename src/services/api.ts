const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface CadastroDados {
  nome: string;
  idade: number;
  sexo: string;
  email: string;
  telefone: string;
  senha?: string;
}

export interface PerfilDados {
  peso?: number;
  altura?: number;
  fotoPerfil?: string | null;
}

export interface SerieExecutadaPayload {
  numeroSerie?: number;
  carga?: number | string | null;
  repeticoesFeitas?: number;
  concluida?: boolean;
  observacao?: string | null;
}

export interface ExercicioRealizadoPayload {
  nome: string;
  series?: number;
  repeticoes?: string | number;
  descansoSegundos?: number;
  cargaSugerida?: number | string | null;
  ordem?: number;
  grupoMuscular?: string | null;
  equipamento?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  imagemUrl?: string | null;
  videoUrl?: string | null;
  carga?: number | string | null;
  seriesExecutadas?: SerieExecutadaPayload[];
}

export interface FinalizarTreinoPayload {
  tipo: string;
  diaSemana: string;
  duracaoSegundos?: number;
  exerciciosRealizados: ExercicioRealizadoPayload[];
}

export interface DashboardResumoResponse {
  resumo: {
    totalTreinos: number;
    totalVolumeKg: number;
    totalDuracaoSegundos: number;
  };
  ultimoTreino: {
    id: number;
    nome: string;
    dataTreino: string;
    duracaoSegundos: number;
    exercicios: { nome: string; series: number; volumeKg: number }[];
  } | null;
  semana: { date: string; label: string; treinos: number }[];
  destaques: {
    recordeExercicio: string;
    recordeCargaKg: number;
  };
}

export interface RecordePessoal {
  exercicio: string;
  carga: number;
  repeticoes: number;
  data: string;
  isNovo: boolean;
  historico: {
    carga: number;
    repeticoes: number;
    data: string;
  }[];
}

export interface ClienteLista {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  idade?: number;
  sexo?: string;
  situacao?: string;
  peso?: number;
  altura?: number;
  dataNascimento?: string;
  dataCriacao?: string;
}

export interface CadastroClienteDados {
  nome: string;
  idade: string;
  sexo: string;
  email: string;
  telefone: string;
  senha: string;
}


// Helper para fazer requisições autenticadas de forma segura
async function authenticatedFetch(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => { headers[key] = value; });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => { headers[key] = value; });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    // Lança erro em vez de redirecionar com window.location.href.
    // O reload forçado causava loop de requisições — o RotaProtegida
    // já cuida do redirecionamento via router.push quando necessário.
    if (response.status === 401) {
      throw new Error("não autorizado");
    }

    return response;
  } catch (error) {
    console.error(`Erro ao buscar ${endpoint}:`, error);
    throw error;
  }
}

async function readResponseData(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text;
}

export async function login(email: string, senha: string) {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    credentials: "include", // ← essencial para cookies funcionarem
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha }),
  });
  return res.json();
}

export async function logoutUsuario() {
  await fetch(`${API_URL}/logout`, {
    method: "POST",
    credentials: "include",
  });
}

export async function cadastro(dados: CadastroDados) {
  try {
    const response = await fetch(`${API_URL}/cadastro`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados),
    });
    return response.json();
  } catch (error) {
    console.error("Erro na função cadastro:", error);
    return { message: "Erro de conexão com o servidor" };
  }
}

export async function googleLogin(token: string) {
  try {
    const response = await fetch(`${API_URL}/google-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    return response.json();
  } catch (error) {
    console.error("Erro na função googleLogin:", error);
    return { message: "Erro de conexão com o servidor" };
  }
}

export async function forgotPassword(email: string) {
  try {
    const response = await fetch(`${API_URL}/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    return response.json();
  } catch (error) {
    console.error("Erro na função forgotPassword:", error);
    return { message: "Erro de conexão com o servidor" };
  }
}

export async function resetPassword(token: string, novaSenha: string) {
  try {
    const response = await fetch(`${API_URL}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, novaSenha }),
    });
    return response.json();
  } catch (error) {
    console.error("Erro na função resetPassword:", error);
    return { message: "Erro de conexão com o servidor" };
  }
}

export async function finalizarTreino(treino: FinalizarTreinoPayload) {
  try {
    const response = await authenticatedFetch("/workouts/finalizar", {
      method: "POST",
      body: JSON.stringify(treino),
    });
    return response.json();
  } catch (error) {
    console.error("Erro na função finalizarTreino:", error);
    return { message: "Erro ao finalizar treino" };
  }
}

export async function listarTreinos() {
  try {
    const response = await authenticatedFetch("/workouts/listar");
    return response.json();
  } catch (error) {
    console.error("Erro na função listarTreinos:", error);
    return [];
  }
}

export async function salvarHistorico(treinoId: number) {
  try {
    const response = await authenticatedFetch("/workouts/historico/salvar", {
      method: "POST",
      body: JSON.stringify({ treinoId }),
    });
    return response.json();
  } catch (error) {
    console.error("Erro na função salvarHistorico:", error);
    return { message: "Erro ao salvar histórico" };
  }
}

export async function listarHistorico() {
  try {
    const response = await authenticatedFetch("/workouts/historico/listar");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro na função listarHistorico:", error);
    return [];
  }
}

export async function getDashboardResumo(): Promise<DashboardResumoResponse | null> {
  try {
    const response = await authenticatedFetch("/workouts/dashboard/resumo");
    const data = await response.json();
    if (!response.ok) return null;
    return data as DashboardResumoResponse;
  } catch (error) {
    console.error("Erro na função getDashboardResumo:", error);
    return null;
  }
}

export async function listarRecordesPessoais(): Promise<RecordePessoal[]> {
  try {
    const response = await authenticatedFetch("/workouts/recordes");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro na função listarRecordesPessoais:", error);
    return [];
  }
}

export async function desativarConta() {
  try {
    const response = await authenticatedFetch("/desativar", {
      method: "POST",
    });
    return response.json();
  } catch (error) {
    console.error("Erro na função desativarConta:", error);
    return { message: "Erro ao desativar conta" };
  }
}

export async function redefinirSenhaLogado(novaSenha: string) {
  try {
    const response = await authenticatedFetch("/redefinir-senha-logado", {
      method: "POST",
      body: JSON.stringify({ novaSenha }),
    });
    const data = await readResponseData(response);
    if (!response.ok) {
      const message = typeof data === "object" && data && "message" in data
        ? String((data as { message?: string }).message || "Erro ao redefinir senha")
        : "Erro ao redefinir senha";
      throw new Error(message);
    }
    return data;
  } catch (error) {
    console.error("Erro na função redefinirSenhaLogado:", error);
    throw error;
  }
}

export async function getPerfil() {
  try {
    const response = await fetch(`${API_URL}/perfil`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (response.status === 401) return null; // sem sessão — silencioso

    return response.json();
  } catch (error) {
    console.error("Erro na função getPerfil:", error);
    return null;
  }
}

export async function patchPerfil(dados: PerfilDados) {
  try {
    const response = await authenticatedFetch("/perfil", {
      method: "PATCH",
      body: JSON.stringify(dados),
    });
    const data = await readResponseData(response);
    if (!response.ok) {
      const message = response.status === 413
        ? "Imagem muito grande. Escolha uma foto menor."
        : typeof data === "object" && data && "message" in data
          ? String((data as { message?: string }).message || "Erro ao atualizar perfil")
          : "Erro ao atualizar perfil";
      throw new Error(message);
    }
    if (typeof data === "object" && data) {
      return data;
    }
    throw new Error("Resposta inválida ao atualizar perfil");
  } catch (error) {
    console.error("Erro na função patchPerfil:", error);
    throw error;
  }
}

export async function listarClientes(): Promise<ClienteLista[]> {
  try {
    const response = await authenticatedFetch("/admin/users");
    console.log("[listarClientes] status:", response.status);
    const data = await response.json();
    console.log("[listarClientes] data:", data);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Erro na função listarClientes:", error);
    return [];
  }
}

export async function cadastrarCliente(dados: CadastroClienteDados) {
  try {
    const response = await authenticatedFetch("/cadastro-cliente", {
      method: "POST",
      body: JSON.stringify({
        ...dados,
        idade: dados.idade ? Number(dados.idade) : null,
      }),
    });
    const data = await readResponseData(response);
    if (!response.ok) {
      const message =
        typeof data === "object" && data && "message" in data
          ? String((data as { message?: string }).message || "Erro ao cadastrar cliente")
          : "Erro ao cadastrar cliente";
      throw new Error(message);
    }
    return data;
  } catch (error) {
    console.error("Erro na função cadastrarCliente:", error);
    throw error;
  }
}