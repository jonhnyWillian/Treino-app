import jwt from "jsonwebtoken";
/**
 * Middleware de autenticação JWT.
 * Intercepta toda requisição que precise de autenticação e verifica
 * se o usuário possui um token válido antes de permitir o acesso à rota.
 * O token pode vir de dois lugares:
 *  - Cookie chamado "token" (fluxo web/browser)
 *  - Header Authorization com o formato "Bearer <token>" (fluxo mobile/API)
 */
export function verificarToken(req, res, next) {
  const secret = process.env.JWT_SECRET;

  // Sem o secret configurado no ambiente, não tem como validar nenhum token.
  // Retornamos 500 porque é um problema de configuração do servidor, não do cliente.
  if (!secret) {
    return res.status(500).json({ message: "JWT_SECRET não definido" });
  }
  // Tenta extrair o token de cookie primeiro; se não encontrar, tenta o header.
  // A ordem importa: cookies são a forma preferida no fluxo web (mais seguros contra XSS),
  // enquanto o Bearer token é usado por clientes móveis e integrações de API.
  const token = req.cookies?.token || extrairBearerToken(req.headers.authorization);

  // Se nenhuma das fontes retornou um token, o usuário não está autenticado.
  if (!token) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  try {
    // jwt.verify valida assinatura + expiração em uma única chamada.
    // Se o token for válido, decodifica o payload e salva em req.usuario,
    // tornando os dados do usuário (id, role, etc.) disponíveis nos próximos middlewares e na rota.
    req.usuario = jwt.verify(token, secret);
    next(); // Passa para o próximo middleware ou handler da rota
  } catch (error) {
    // jwt.verify lança exceções tipadas — diferenciamos expirado de inválido
    // para dar ao cliente uma mensagem de erro mais útil.
    // TokenExpiredError → token existiu mas já passou do prazo
    // JsonWebTokenError  → token malformado, assinatura incorreta, etc.
    const message =
      error?.name === "TokenExpiredError" ? "Token expirado" : "Token inválido";
    return res.status(401).json({ message });
  }
}

/**
 * Extrai o token JWT de um header Authorization no formato "Bearer <token>".
 *
 * Por que uma função separada?
 * Isola a lógica de parsing do header, deixando verificarToken mais legível
 * e facilitando testes unitários dessa lógica específica.
 *
 * @param {string | undefined} authHeader - Valor do header Authorization
 * @returns {string | null} O token puro, ou null se o header for inválido/ausente
 */
function extrairBearerToken(authHeader) {
  if (!authHeader) {
    return null;
  }

  // Divide o header em partes pelo espaço (trim + regex para lidar com espaços extras).
  // Esperamos exatamente duas partes: ["Bearer", "<token>"]
  const parts = String(authHeader).trim().split(/\s+/);

  // Valida o formato esperado. Qualquer desvio (token faltando, prefixo errado,
  // múltiplos espaços já tratados, mas partes extras indicam formato inválido)
  // resulta em null — quem chamou trata como "sem token".
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }

  return parts[1]; // Retorna apenas o token, sem o prefixo "Bearer"
}

/**
 * Middleware de autorização por papel (role-based access control).
 *
 * Deve ser usado DEPOIS de verificarToken nas rotas,
 * pois depende de req.usuario já estar populado.
 *
 * Exemplo de uso na rota:
 *   router.delete("/usuario/:id", verificarToken, verificarAdmin, deletarUsuario)
 *
 * Separar autenticação (verificarToken) de autorização (verificarAdmin) é
 * uma boa prática: permite reutilizar cada middleware de forma independente.
 */
export function verificarAdmin(req, res, next) {
  // Verifica se o usuário autenticado possui o papel de administrador.
  // O optional chaining (?.) protege contra req.usuario undefined
  // (caso verificarAdmin seja usado sem verificarToken por engano).
  if (req.usuario?.role !== "admin") {
    // 403 Forbidden: o usuário está autenticado, mas não tem permissão.
    // Diferente do 401 (não autenticado), o 403 deixa claro que a identidade
    // foi reconhecida, mas o acesso ao recurso foi negado.
    return res.status(403).json({ message: "Acesso restrito a administradores" });
  }

  next(); // Usuário é admin — permite seguir para o handler da rota
}