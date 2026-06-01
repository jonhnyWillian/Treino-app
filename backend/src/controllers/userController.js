import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { db } from "../config/knex.js";
import { enviarEmailRecuperacao } from "../config/email.js";

const SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const BCRYPT_SALT_ROUNDS = 10;
const SENHA_MIN_LENGTH = 8;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Garante que a aplicação não suba sem o segredo do JWT definido.
// Se estivesse undefined, todos os tokens gerados seriam inseguros ou inválidos.
if (!SECRET) {
  throw new Error("JWT_SECRET não definido no .env");
}

// ─────────────────────────────────────────────
// Utilitários internos
// ─────────────────────────────────────────────

/**
 * Normaliza um e-mail removendo espaços e convertendo para minúsculas.
 *
 * Por que: e-mails são case-insensitive por especificação (RFC 5321).
 * Sem normalização, "User@Email.com" e "user@email.com" seriam tratados
 * como contas diferentes no banco, causando duplicatas.
 */
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Gera o hash bcrypt de uma senha em texto puro.
 *
 * Por que: nunca armazenamos senhas em texto puro.
 * O bcrypt aplica um salt aleatório a cada chamada, tornando
 * dois hashes da mesma senha completamente diferentes — o que
 * protege contra ataques de rainbow table.
 * BCRYPT_SALT_ROUNDS = 10 equilibra segurança e performance.
 */
function hashSenha(senha) {
  return bcrypt.hash(senha, BCRYPT_SALT_ROUNDS);
}

/**
 * Gera um JWT (JSON Web Token) assinado com os dados do usuário.
 *
 * Por que: o JWT é o mecanismo de autenticação stateless da API.
 * Ele carrega id, email e role para que as rotas protegidas
 * identifiquem quem está fazendo a requisição sem precisar
 * consultar o banco a cada request.
 * Expira em 1h para limitar o tempo de vida de tokens vazados.
 */
function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email, role: usuario.role ?? "cliente" },
    SECRET,
    { expiresIn: "1h" }
  );
}

/**
 * Valida se a senha atende ao tamanho mínimo exigido.
 *
 * Por que: senhas curtas são vulneráveis a força bruta.
 * Centralizar a validação aqui evita duplicar a mesma checagem
 * em cadastro, redefinição e reset — e facilita ajustar a regra no futuro.
 *
 * @returns {{ ok: boolean, message?: string }}
 */
function validarSenha(senha) {
  if (!senha || senha.length < SENHA_MIN_LENGTH) {
    return {
      ok: false,
      message: `A senha deve ter no mínimo ${SENHA_MIN_LENGTH} caracteres`,
    };
  }
  return { ok: true };
}

/**
 * Valida a foto de perfil antes de persistir no banco.
 *
 * Por que: a foto é armazenada como string base64 diretamente na coluna.
 * Sem limite de tamanho, uma imagem grande poderia sobrecarregar o banco
 * e a rede (≈ 3 MB já é alto para base64 inline).
 * Aceitar undefined/null é intencional: permite atualizar outros campos
 * sem obrigar o envio de uma foto.
 *
 * @returns {{ ok: boolean, message?: string }}
 */
function validarFotoPerfil(fotoPerfil) {
  if (fotoPerfil === undefined) return { ok: true };
  if (!fotoPerfil) return { ok: true };
  if (typeof fotoPerfil !== "string") {
    return { ok: false, message: "Foto de perfil inválida" };
  }
  if (fotoPerfil.length > 3_000_000) {
    return { ok: false, message: "Imagem muito grande. Use uma foto menor." };
  }
  return { ok: true };
}

/**
 * Envia o cookie de autenticação e o payload do usuário na resposta.
 *
 * Por que existir como função separada: login por e-mail e login pelo Google
 * precisam da mesma resposta final. Centralizar aqui evita divergência entre
 * as duas rotas caso a estrutura da resposta mude.
 *
 * O token é enviado como cookie HttpOnly (não acessível via JS no browser)
 * para mitigar ataques XSS que tentariam roubar o token do localStorage.
 * Em produção, secure:true garante que só trafega via HTTPS.
 */
function responderLogin(res, message, usuario, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge: 60 * 60 * 1000, // 1 hora em ms — sincronizado com expiresIn do JWT
  });

  res.json({
    message,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      sexo: usuario.sexo,
      fotoPerfil: usuario.fotoPerfil ?? null,
      role: usuario.role ?? "cliente",
    },
  });
}

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────

/**
 * Cadastra um novo usuário via formulário público (auto-registro).
 *
 * Por que separar do cadastrarClienteAdmin:
 * Esta rota é pública e não exige autenticação. Ela não aceita campos
 * sensíveis como `role` ou `dataNascimento` — o usuário recebe sempre
 * o role padrão definido pelo banco.
 *
 * Fluxo:
 * 1. Valida campos obrigatórios e força mínima da senha.
 * 2. Checa duplicidade de e-mail antes de inserir.
 * 3. Persiste com senha hasheada — nunca em texto puro.
 *
 * Rota: POST /auth/cadastro
 */
export async function cadastrarUsuario(req, res) {
  try {
    let { nome, idade, sexo, telefone, email, senha } = req.body;
    nome = String(nome || "").trim();
    email = normalizeEmail(email);

    if (!nome || !email || !senha) {
      return res.status(400).json({ message: "Nome, email e senha são obrigatórios" });
    }

    const validacaoSenha = validarSenha(senha);
    if (!validacaoSenha.ok) {
      return res.status(400).json({ message: validacaoSenha.message });
    }

    const userCheck = await db("Usuarios").where({ email }).first();
    if (userCheck) {
      return res.status(400).json({ message: "Email já cadastrado" });
    }

    const senhaHash = await hashSenha(senha);
    const [usuario] = await db("Usuarios")
      .insert({ nome, idade: Number(idade) || null, sexo, telefone, email, senha: senhaHash })
      .returning(["id", "nome", "email"]);

    res.status(201).json({ message: "Usuário cadastrado com sucesso", usuario });

  } catch (error) {
    console.error("❌ ERRO NO CADASTRO:", error);
    res.status(500).json({ message: "Erro ao cadastrar usuário" });
  }
}

/**
 * Cadastra um cliente pelo painel administrativo.
 *
 * Por que existe além do cadastrarUsuario:
 * O admin precisa de campos extras (dataNascimento) e garantia de que o
 * cliente criado por esta rota sempre tenha role = 'cliente', independente
 * do que for enviado no body. A separação torna as permissões explícitas.
 *
 * Rota: POST /admin/clientes
 * Middleware: verificarToken + verificarAdmin
 */
export async function cadastrarClienteAdmin(req, res) {
  try {
    let { nome, idade, sexo, telefone, email, senha, dataNascimento } = req.body;
    nome = String(nome || "").trim();
    email = normalizeEmail(email);

    if (!nome || !email || !senha) {
      return res.status(400).json({ message: "Nome, email e senha são obrigatórios" });
    }

    const validacaoSenha = validarSenha(senha);
    if (!validacaoSenha.ok) {
      return res.status(400).json({ message: validacaoSenha.message });
    }

    const userCheck = await db("Usuarios").where({ email }).first();
    if (userCheck) {
      return res.status(400).json({ message: "Email já cadastrado" });
    }

    const senhaHash = await hashSenha(senha);
    const [usuario] = await db("Usuarios")
      .insert({
        nome,
        idade: Number(idade) || null,
        sexo,
        telefone,
        email,
        senha: senhaHash,
        dataNascimento: dataNascimento || null,
        role: "cliente", // role fixo: admin não pode criar outro admin por aqui
      })
      .returning(["id", "nome", "email"]);

    res.status(201).json({ message: "Cliente cadastrado com sucesso", usuario });

  } catch (error) {
    console.error("❌ ERRO NO CADASTRO CLIENTE:", error);
    res.status(500).json({ message: "Erro ao cadastrar cliente" });
  }
}

/**
 * Autentica um usuário com e-mail e senha.
 *
 * Fluxo:
 * 1. Busca o usuário pelo e-mail normalizado.
 * 2. Rejeita contas desativadas antes de comparar a senha —
 *    evitar timing attack não é o foco aqui porque a conta já é inválida.
 * 3. Compara a senha com bcrypt.compare (constante em tempo para hashes).
 * 4. Gera o JWT e responde com cookie + dados do usuário.
 *
 * Por que retornar "Email ou senha inválidos" para os dois casos de falha:
 * Mensagens distintas ("usuário não existe" vs "senha errada") facilitariam
 * enumeração de e-mails cadastrados por um atacante.
 *
 * Rota: POST /auth/login
 */
export async function loginUsuario(req, res) {
  try {
    let { email, senha } = req.body;
    email = normalizeEmail(email);

    if (!email || !senha) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }
    const usuario = await db("Usuarios").where({ email }).first();
    if (!usuario) {
      return res.status(401).json({ message: "Email ou senha inválidos" });
    }
    if (usuario.situacao === "desativado") {
      return res.status(403).json({ message: "Conta desativada" });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ message: "Email ou senha inválidos" });
    }
    const token = gerarToken(usuario);
    responderLogin(res, "Login realizado com sucesso", usuario, token);

  } catch (error) {
    console.error("❌ ERRO NO LOGIN:", error);
    res.status(500).json({ message: "Erro no login" });
  }
}

/**
 * Encerra a sessão do usuário limpando o cookie de autenticação.
 *
 * Por que limpar o cookie e não apenas ignorá-lo:
 * O JWT continua tecnicamente válido até expirar (1h), mas remover o cookie
 * garante que o browser não o envie mais nas próximas requisições,
 * efetivando o logout do ponto de vista do cliente.
 * As opções do clearCookie devem espelhar as opções usadas no set —
 * caso contrário o browser pode não reconhecer o cookie para deletar.
 *
 * Rota: POST /auth/logout
 */
export function logout(req, res) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  });
  res.json({ message: "Logout realizado" });
}

/**
 * Inicia o fluxo de recuperação de senha enviando um link por e-mail.
 *
 * Fluxo:
 * 1. Busca o usuário pelo e-mail informado.
 * 2. Gera um token criptograficamente seguro (32 bytes → 64 hex chars).
 * 3. Persiste o token e sua expiração (15 min) no banco.
 * 4. Envia o link de reset por e-mail.
 *
 * Por que a resposta é idêntica quando o e-mail não existe:
 * Retornar uma mensagem diferente ("e-mail não cadastrado") permitiria
 * que um atacante descubra quais e-mails estão na base — técnica conhecida
 * como user enumeration. A resposta genérica impede isso.
 *
 * Por que 15 minutos de expiração:
 * Janela curta minimiza o risco de um link vazado ser usado mais tarde.
 *
 * Rota: POST /auth/esqueci-senha
 */
export async function forgotPassword(req, res) {
  try {
    let { email } = req.body;
    email = normalizeEmail(email);

    if (!email) {
      return res.status(400).json({ message: "Email é obrigatório" });
    }

    const usuario = await db("Usuarios")
      .where({ email })
      .select("id", "nome", "email")
      .first();

    // Resposta genérica intencional mesmo quando o usuário não existe.
    if (!usuario) {
      return res.json({ message: "Se o email estiver cadastrado, enviaremos instruções" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const exp = new Date(Date.now() + 1000 * 60 * 15); // agora + 15 minutos

    await db("Usuarios")
      .where({ id: usuario.id })
      .update({ resetToken: token, resetTokenExp: exp });

    const baseUrl = process.env.APP_URL;
    const link = `${baseUrl}/resetar-senha?token=${token}`;
    await enviarEmailRecuperacao(usuario.email, link);

    res.json({ message: "Se o email estiver cadastrado, enviaremos instruções" });

  } catch (error) {
    console.error("❌ ERRO forgotPassword:", error);
    res.status(500).json({ message: "Erro ao processar recuperação" });
  }
}

/**
 * Conclui o fluxo de recuperação: valida o token e redefine a senha.
 *
 * Fluxo:
 * 1. Busca o usuário pelo token E verifica que ele não expirou numa única query.
 * 2. Valida a nova senha.
 * 3. Substitui o hash da senha e anula o token (resetToken = null).
 *
 * Por que anular o token após uso:
 * Sem essa etapa, o mesmo link de reset poderia ser reutilizado múltiplas vezes
 * enquanto ainda estiver dentro da janela de 15 min — o que seria um vetor
 * de ataque se o e-mail fosse interceptado.
 *
 * Por que buscar por token E expiração juntos:
 * Fazer as duas checagens numa query evita uma race condition onde o token
 * poderia expirar entre a busca e a verificação separada.
 *
 * Rota: POST /auth/resetar-senha
 */
export async function resetPassword(req, res) {
  try {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
      return res.status(400).json({ message: "Dados incompletos" });
    }

    const validacaoSenha = validarSenha(novaSenha);
    if (!validacaoSenha.ok) {
      return res.status(400).json({ message: validacaoSenha.message });
    }

    const usuario = await db("Usuarios")
      .where("resetToken", token)
      .andWhere("resetTokenExp", ">", new Date())
      .first();

    if (!usuario) {
      return res.status(400).json({ message: "Token inválido ou expirado" });
    }

    const hash = await hashSenha(novaSenha);

    // Zera o token após uso para que o mesmo link não possa ser reutilizado.
    await db("Usuarios")
      .where({ id: usuario.id })
      .update({ senha: hash, resetToken: null, resetTokenExp: null });

    res.json({ message: "Senha redefinida com sucesso!" });

  } catch (error) {
    console.error("❌ ERRO RESET:", error);
    res.status(500).json({ message: "Erro ao redefinir senha" });
  }
}

// ─────────────────────────────────────────────
// Perfil (cliente — usa o id do token JWT)
// ─────────────────────────────────────────────

/**
 * Retorna os dados do perfil do usuário autenticado.
 *
 * Por que usar req.usuario.id (do JWT) em vez de um parâmetro de rota:
 * Garante que cada usuário só possa ver seus próprios dados — o id
 * vem do token assinado, não de input do cliente, eliminando
 * o risco de Insecure Direct Object Reference (IDOR).
 *
 * Rota: GET /perfil
 * Middleware: verificarToken
 */
export async function getPerfil(req, res) {
  try {
    const usuario = await db("Usuarios")
      .where({ id: req.usuario.id })
      .select("id", "nome", "email", "idade", "peso", "altura", "sexo", "fotoPerfil", "role")
      .first();

    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    res.json(usuario);
  } catch (error) {
    console.error("❌ ERRO PERFIL:", error);
    res.status(500).json({ message: "Erro ao buscar perfil" });
  }
}

/**
 * Atualiza campos do perfil do usuário autenticado (peso, altura, foto).
 *
 * Por que construir updateData dinamicamente:
 * Se o frontend enviar apenas `peso`, não queremos sobrescrever `altura`
 * e `fotoPerfil` com undefined. Construir o objeto só com os campos
 * presentes no body garante updates parciais seguros (PATCH semântico).
 *
 * Por que não permitir alterar nome/email aqui:
 * Esses campos têm impacto maior (e-mail é chave de login). Mantê-los
 * em uma rota específica força uma UX mais consciente e facilita auditar
 * mudanças críticas de conta separadamente.
 *
 * Rota: PATCH /perfil
 * Middleware: verificarToken
 */
export async function updatePerfil(req, res) {
  try {
    const id = req.usuario.id;
    const { peso, altura, fotoPerfil } = req.body;

    const updateData = {};

    if (peso !== undefined) {
      const p = Number(peso);
      if (!Number.isFinite(p) || p <= 0) {
        return res.status(400).json({ message: "Peso inválido" });
      }
      updateData.peso = p;
    }

    if (altura !== undefined) {
      const a = Number(altura);
      if (!Number.isFinite(a) || a <= 0) {
        return res.status(400).json({ message: "Altura inválida" });
      }
      updateData.altura = a;
    }

    if (fotoPerfil !== undefined) {
      const validacaoFoto = validarFotoPerfil(fotoPerfil);
      if (!validacaoFoto.ok) {
        return res.status(400).json({ message: validacaoFoto.message });
      }
      updateData.fotoPerfil = fotoPerfil || null;
    }

    await db("Usuarios").where({ id }).update(updateData);

    // Rebusca o registro atualizado para retornar o estado real do banco,
    // evitando discrepâncias caso alguma coluna tenha trigger ou default.
    const usuario = await db("Usuarios")
      .where({ id })
      .select("id", "nome", "email", "idade", "peso", "altura", "sexo", "fotoPerfil")
      .first();

    res.json(usuario);

  } catch (error) {
    console.error("❌ ERRO UPDATE PERFIL:", error);
    res.status(500).json({ message: "Erro ao atualizar perfil" });
  }
}

/**
 * Marca a conta do usuário autenticado como desativada (soft delete).
 *
 * Por que soft delete em vez de DELETE físico:
 * Preserva o histórico de treinos e dados associados ao usuário,
 * que seriam perdidos com uma exclusão física por causa das foreign keys.
 * Permite reativar a conta no futuro sem perda de dados.
 * A flag `situacao = 'desativado'` é checada no loginUsuario — a conta
 * fica inacessível sem precisar remover nada do banco.
 *
 * Rota: PATCH /perfil/desativar
 * Middleware: verificarToken
 */
export async function desativarConta(req, res) {
  try {
    await db("Usuarios")
      .where({ id: req.usuario.id })
      .update({ situacao: "desativado" });

    res.json({ message: "Conta desativada com sucesso" });

  } catch (error) {
    console.error("❌ ERRO AO DESATIVAR CONTA:", error);
    res.status(500).json({ message: "Erro ao desativar conta" });
  }
}

/**
 * Permite que o usuário autenticado redefina sua própria senha.
 *
 * Por que existe além do resetPassword (que usa token de e-mail):
 * resetPassword é para quem esqueceu a senha e não está logado.
 * Esta rota é para usuários já autenticados que querem trocar a senha
 * voluntariamente — não exige token de reset, usa o JWT da sessão.
 *
 * Rota: PATCH /perfil/redefinir-senha
 * Middleware: verificarToken
 */
export async function redefinirSenhaLogado(req, res) {
  try {
    const { novaSenha } = req.body;

    if (!novaSenha) {
      return res.status(400).json({ message: "Nova senha é obrigatória" });
    }

    const validacaoSenha = validarSenha(novaSenha);
    if (!validacaoSenha.ok) {
      return res.status(400).json({ message: validacaoSenha.message });
    }

    const senhaHash = await hashSenha(novaSenha);

    await db("Usuarios")
      .where({ id: req.usuario.id })
      .update({ senha: senhaHash });

    res.json({ message: "Senha redefinida com sucesso" });

  } catch (error) {
    console.error("❌ ERRO AO REDEFINIR SENHA:", error);
    res.status(500).json({ message: "Erro ao redefinir senha" });
  }
}

/**
 * Autentica (ou cadastra automaticamente) um usuário via Google OAuth.
 *
 * Fluxo:
 * 1. Recebe o ID token emitido pelo Google SDK no cliente.
 * 2. Verifica a assinatura do token com a biblioteca oficial do Google —
 *    garantindo que não foi forjado e que o audience bate com nosso client_id.
 * 3. Se o e-mail ainda não está na base, cria o usuário com uma senha
 *    aleatória inutilizável (o usuário sempre fará login pelo Google,
 *    não por senha — a coluna não pode ser NULL pelo schema).
 * 4. Rejeita contas desativadas antes de emitir o JWT.
 *
 * Por que gerar uma senha dummy em vez de deixar NULL:
 * A coluna `senha` provavelmente tem NOT NULL. Além disso, manter uma
 * senha inválida (hash de bytes aleatórios) impede que alguém tente
 * fazer login convencional com esse e-mail mesmo que adivinhe a senha,
 * pois o hash nunca corresponderá a nenhuma entrada real.
 *
 * Rota: POST /auth/google
 */
export async function googleLogin(req, res) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token do Google não fornecido" });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const { email, name } = ticket.getPayload();
    const emailNormalizado = normalizeEmail(email);

    let usuario = await db("Usuarios").where({ email: emailNormalizado }).first();

    if (!usuario) {
      // Senha aleatória e inutilizável: impede login convencional com este e-mail.
      const senhaDummy = crypto.randomBytes(16).toString("hex");
      const senhaHash = await hashSenha(senhaDummy);

      const [novoUsuario] = await db("Usuarios")
        .insert({ nome: name, email: emailNormalizado, senha: senhaHash })
        .returning(["id", "nome", "email", "sexo"]);

      usuario = novoUsuario;
    }

    if (usuario.situacao === "desativado") {
      return res.status(403).json({ message: "Conta desativada" });
    }

    const jwtToken = gerarToken(usuario);
    responderLogin(res, "Login com Google realizado com sucesso", usuario, jwtToken);

  } catch (error) {
    console.error("❌ ERRO GOOGLE LOGIN:", error);
    res.status(500).json({ message: "Erro ao processar login com Google" });
  }
}

// ─────────────────────────────────────────────
// Admin — gestão de clientes
// ─────────────────────────────────────────────

/**
 * Lista todos os usuários (clientes e admins) para o painel administrativo.
 *
 * Por que usar orWhere em vez de whereIn:
 * O Knex permite encadear orWhere diretamente, tornando a query legível.
 * whereIn(['role'], ['cliente', 'admin']) seria equivalente — ambos geram
 * uma cláusula WHERE role IN (...) no SQL final.
 *
 * Por que não retornar `senha`, `resetToken` e `resetTokenExp`:
 * Dados sensíveis nunca devem trafegar para o frontend, mesmo no painel admin.
 * O SELECT explícito garante que adicionar colunas ao schema no futuro
 * não vaze dados acidentalmente.
 *
 * Rota: GET /admin/users
 * Middleware: verificarToken + verificarAdmin
 */
export async function listarUsuarios(req, res) {
  try {
    const usuarios = await db("Usuarios")
      .where({ role: "cliente" }).orWhere({ role: "admin" })
      .select(
        "id",
        "nome",
        "email",
        "telefone",
        "idade",
        "sexo",
        "situacao",
        "peso",
        "altura",
        "dataNascimento",
        "dataCriacao"
      )
      .orderBy("nome", "asc");

    res.json(usuarios);
  } catch (error) {
    console.error("❌ ERRO AO LISTAR USUÁRIOS:", error);
    res.status(500).json({ message: "Erro ao listar usuários" });
  }
}

/**
 * Edita dados de um cliente específico pelo ID (painel administrativo).
 *
 * Campos editáveis: nome, email, telefone, idade, sexo, situacao, senha.
 * Campos protegidos: dataNascimento, role, id — nunca alterados por esta rota.
 *
 * Por que proibir edição de admins aqui:
 * Esta rota é usada pelo painel de gestão de clientes. Permitir que um admin
 * edite outro admin (inclusive senha) criaria um vetor de escalada de privilégios
 * caso a conta de um admin fosse comprometida. Alterações em admins devem
 * ocorrer por uma rota específica com controles mais rígidos.
 *
 * Por que verificar duplicidade de e-mail com whereNot({ id }):
 * Sem esse filtro, salvar o formulário sem alterar o e-mail retornaria
 * "email já em uso" porque o próprio registro já tem aquele e-mail.
 *
 * Por que rebuscar o registro após o update:
 * O Knex não retorna os dados atualizados automaticamente em todos os drivers.
 * Rebuscar garante que a resposta reflita o estado real do banco,
 * incluindo eventuais defaults ou triggers.
 *
 * Rota: PATCH /admin/users/:id
 * Middleware: verificarToken + verificarAdmin
 */
export async function editarUsuario(req, res) {
  try {
    const { id } = req.params;
    const { nome, email, telefone, idade, sexo, situacao, senha } = req.body;

    // Verifica se o cliente existe antes de tentar editar.
    const usuario = await db("Usuarios").where({ id }).first();
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Protege a conta do admin: nenhum admin pode ser editado por esta rota.
    if (usuario.role === "admin") {
      return res.status(403).json({ message: "Não é permitido editar contas de administrador" });
    }

    // Objeto construído dinamicamente: só persiste campos enviados na requisição.
    // Isso evita sobrescrever campos com undefined caso o frontend omita algum campo.
    const updateData = {};

    if (nome !== undefined)     updateData.nome     = String(nome).trim();
    if (telefone !== undefined) updateData.telefone = telefone;
    if (idade !== undefined)    updateData.idade    = idade ? Number(idade) : null;
    if (sexo !== undefined)     updateData.sexo     = sexo;
    if (situacao !== undefined) updateData.situacao = situacao;

    // Email: verifica duplicidade antes de aceitar.
    // Ignora o próprio registro na checagem para permitir salvar sem mudar o email.
    if (email !== undefined) {
      const emailNormalizado = normalizeEmail(email);
      const emailEmUso = await db("Usuarios")
        .where({ email: emailNormalizado })
        .whereNot({ id })
        .first();

      if (emailEmUso) {
        return res.status(400).json({ message: "Email já está em uso por outro usuário" });
      }
      updateData.email = emailNormalizado;
    }

    // Senha: só atualiza se foi enviada, com validação de tamanho mínimo.
    if (senha) {
      const validacaoSenha = validarSenha(senha);
      if (!validacaoSenha.ok) {
        return res.status(400).json({ message: validacaoSenha.message });
      }
      updateData.senha = await hashSenha(senha);
    }

    await db("Usuarios").where({ id }).update(updateData);

    // Rebusca o registro atualizado para retornar os dados reais do banco.
    const usuarioAtualizado = await db("Usuarios")
      .where({ id })
      .select("id", "nome", "email", "telefone", "idade", "sexo", "situacao", "dataNascimento", "dataCriacao")
      .first();

    res.json({ message: "Usuário atualizado com sucesso", usuario: usuarioAtualizado });

  } catch (error) {
    console.error("❌ ERRO AO EDITAR USUÁRIO:", error);
    res.status(500).json({ message: "Erro ao editar usuário" });
  }
}