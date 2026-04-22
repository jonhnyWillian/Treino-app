import jwt from "jsonwebtoken";

/**
 * Middleware de autenticação JWT para rotas protegidas.
 *
 * Deve ser aplicado em todas as rotas que exigem usuário autenticado.
 * Quando válido, injeta os dados do usuário em `req.usuario` para que
 * controllers downstream possam acessar o id e email sem consultar o banco.
 *
 * Fluxo:
 * 1. Garante que JWT_SECRET está definido no ambiente (falha rápida).
 * 2. Extrai e valida o formato do header Authorization.
 * 3. Verifica a assinatura e expiração do token com a chave secreta.
 * 4. Popula `req.usuario` com o payload decodificado e chama `next()`.
 *
 * Erros possíveis:
 * - 500: JWT_SECRET ausente (problema de configuração do servidor).
 * - 401: Header ausente, malformado, token expirado ou assinatura inválida.
 */
export function verificarToken(req, res, next) {
  const secret = process.env.JWT_SECRET;

  // Falha rápida: se a chave não está definida, o servidor está mal configurado.
  // Retorna 500 em vez de 401 para distinguir erro de infra de erro de autenticação.
  if (!secret) {
    return res.status(500).json({ message: "JWT_SECRET não definido no servidor" });
  }

  // Lê o header Authorization enviado pelo cliente.
  // Padrão esperado: "Authorization: Bearer <token>"
  const authHeader = req.headers?.authorization;

  // Sem header = requisição não autenticada; retorna 401 sem processar mais nada.
  if (!authHeader) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  // Divide o header em ["Bearer", "<token>"] usando qualquer sequência de espaços como separador.
  // Rejeita formatos incorretos como "TOKEN" (sem prefixo) ou "Basic TOKEN" (esquema errado).
  const parts = String(authHeader).trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return res.status(401).json({
      message: "Authorization malformado (use: Bearer TOKEN)",
    });
  }

  const token = parts[1];

  try {
    // Verifica três coisas simultaneamente:
    // 1. A assinatura do token bate com a SECRET (não foi adulterado).
    // 2. O token ainda não expirou (campo `exp` do payload).
    // 3. O formato JWT é válido (três partes separadas por ponto).
    // Lança exceção para qualquer falha — tratada no catch abaixo.
    const decoded = jwt.verify(token, secret);

    // Injeta o payload decodificado (id, email, iat, exp) em req.usuario.
    // Controllers acessam req.usuario.id para identificar o usuário autenticado
    // sem precisar de uma consulta extra ao banco de dados.
    req.usuario = decoded;

    // Token válido: passa o controle para o próximo middleware ou controller da rota.
    next();

  } catch (error) {
    // TokenExpiredError: token bem formado e com assinatura válida, mas já expirou.
    // Diferenciado dos demais para que o cliente saiba que deve renovar o token,
    // e não que as credenciais são inválidas.
    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expirado" });
    }

    // JsonWebTokenError ou NotBeforeError: token adulterado, assinatura inválida
    // ou estrutura corrompida. Resposta genérica evita vazar detalhes do erro.
    return res.status(401).json({ message: "Token inválido" });
  }
}