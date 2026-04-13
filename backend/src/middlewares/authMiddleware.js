import jwt from "jsonwebtoken"; 

// Middleware para verificar se o token é válido
export function verificarToken(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ message: "JWT_SECRET não definido no servidor" });
  }

  // Pega o header de autorização da requisição (Authorization: Bearer TOKEN)
  const authHeader = req.headers?.authorization;

  // Se não existir o header, retorna erro 401 (não autorizado)
  if (!authHeader) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  // O header geralmente vem no formato: "Bearer TOKEN"
  // Aqui estamos separando e pegando apenas o TOKEN
  const parts = String(authHeader).trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return res.status(401).json({ 
      message: "Authorization malformado (use: Bearer TOKEN)" 
    });
  }

  const token = parts[1];

  try {
    // Verifica se o token é válido usando a chave secreta
    // Se for válido, retorna os dados decodificados (payload)
    const decoded = jwt.verify(token, secret);

    // Salva os dados do usuário dentro do objeto req
    // Isso permite acessar essas informações nas próximas etapas (rotas/controllers)
    req.usuario = decoded;

    // Chama a controller
    next();

  } catch (error) {
    // Se o token for inválido, expirado ou adulterado, cai aqui

    if (error?.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expirado" });
    }

    // Retorna erro 401 (não autorizado)
    return res.status(401).json({ message: "Token inválido" });
  }
}