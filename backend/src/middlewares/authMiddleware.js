import jwt from "jsonwebtoken";

/**
 * Middleware de autenticação JWT para rotas protegidas.
 *
 * Injeta `req.usuario` com o payload decodificado (id, email, iat, exp)
 * para que controllers downstream identifiquem o usuário sem consultar o banco.
 *
 * Fluxo:
 * 1. Garante que JWT_SECRET está definido (falha rápida com 500).
 * 2. Extrai e valida o token do header Authorization (Bearer <token>).
 * 3. Verifica assinatura e expiração via jsonwebtoken.
 * 4. Popula `req.usuario` e chama `next()`.
 */
export function verificarToken(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // 500, não 401: problema de configuração do servidor, não de credencial.
    return res.status(500).json({ message: "JWT_SECRET não definido no servidor" });
  }

  const token = extrairBearerToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({
      message: req.headers.authorization
        ? "Authorization malformado (use: Bearer TOKEN)"
        : "Token não fornecido",
    });
  }

  try {
    req.usuario = jwt.verify(token, secret);
    next();
  } catch (error) {
    const mensagens = {
      // TokenExpiredError: token válido mas expirado — cliente deve renovar.
      TokenExpiredError: "Token expirado",
    };
    const message = mensagens[error?.name] ?? "Token inválido";
    return res.status(401).json({ message });
  }
}

/**
 * Extrai o token de um header Authorization no formato "Bearer <token>".
 * Retorna `null` se o header estiver ausente ou malformado.
 */
function extrairBearerToken(authHeader) {
  if (!authHeader) return null;

  const parts = String(authHeader).trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;

  return parts[1];
}