import bcrypt from "bcrypt"; 
import jwt from "jsonwebtoken";
import crypto from "crypto"; 
import { OAuth2Client } from "google-auth-library";
import { sql, getPool } from "../config/db.js"; // Conexão com banco SQL Server
import { enviarEmailRecuperacao } from "../config/email.js";

// Chave secreta usada para assinar o JWT
const SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Validação para garantir que a chave foi definida
if (!SECRET) {
  throw new Error("JWT_SECRET não definido no .env");
}

// Validadecao do email evita duplicidade por maiúsculas/espaços
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

//  CADASTRO DE USUARIO
export async function cadastrarUsuario(req, res) {
  try {
    let { nome, idade, sexo, telefone, email, senha } = req.body;

    // Normaliza os dados
    nome = String(nome || "").trim();
    email = normalizeEmail(email);

    // Validação básica
    if (!nome || !email || !senha) {
      return res.status(400).json({
        message: "Nome, email e senha são obrigatórios",
      });
    }

    // conexão com o banco
    const pool = getPool(); 

    // Verifica se o email já existe
    const userCheck = await pool.request()
      .input("email", sql.NVarChar, email)
      .query("SELECT id FROM Usuarios WHERE email = @email");

    if (userCheck.recordset.length > 0) {
      return res.status(400).json({
        message: "Email já cadastrado",
      });
    }

    // Criptografa a senha antes de salvar
    const senhaHash = await bcrypt.hash(senha, 10);

    // Insere usuário no banco
    const result = await pool.request()
      .input("nome", sql.NVarChar, nome)
      .input("idade", sql.Int, Number(idade) || null)
      .input("sexo", sql.NVarChar, sexo)
      .input("telefone", sql.NVarChar, telefone)
      .input("email", sql.NVarChar, email)
      .input("senha", sql.NVarChar, senhaHash)
      .query(`
        INSERT INTO Usuarios (nome, idade, sexo, telefone, email, senha)
        OUTPUT INSERTED.id, INSERTED.nome, INSERTED.email
        VALUES (@nome, @idade, @sexo, @telefone, @email, @senha)
      `);

    const usuario = result.recordset[0];

    // Retorna sucesso
    res.status(201).json({
      message: "Usuário cadastrado com sucesso",
      usuario,
    });

  } catch (error) {
    console.error("❌ ERRO NO CADASTRO:", error);

    // Erro de chave única duplicada (SQL Server)
    if (error.number === 2627) {
      return res.status(400).json({
        message: "Email já cadastrado",
      });
    }

    res.status(500).json({
      message: "Erro ao cadastrar usuário",
    });
  }
}

//  LOGIN
export async function loginUsuario(req, res) {
  try {
    let { email, senha } = req.body;

    // Normaliza email
    email = normalizeEmail(email);

    // Validação
    if (!email || !senha) {
      return res.status(400).json({
        message: "Email e senha são obrigatórios",
      });
    }

    const pool = getPool();

    // Busca usuário no banco
    const result = await pool.request()
      .input("email", sql.NVarChar, email)
      .query(`
        SELECT 
          id,
          nome,
          email,
          senha,
          situacao,
          sexo
        FROM Usuarios
        WHERE email = @email
      `);

    const usuario = result.recordset[0];

    // Se não existir
    if (!usuario) {
      return res.status(401).json({
        message: "Email ou senha inválidos",
      });
    }

    // Verifica se a conta está desativada
    if (usuario.situacao === 'desativado') {
      return res.status(403).json({
        message: "Esta conta está desativada. Entre em contato com o suporte para reativar.",
      });
    }

    // Compara senha digitada com hash do banco
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({
        message: "Email ou senha inválidos",
      });
    }

    // Gera token JWT válido por 1 hora
    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      SECRET,
      { expiresIn: "1h" }
    );

    // Retorna sucesso + token
    res.json({
      message: "Login realizado com sucesso",
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        sexo: usuario.sexo
      },
    });

  } catch (error) {
    console.error("❌ ERRO NO LOGIN:", error);
    res.status(500).json({ message: "Erro no login" });
  }
}

// ESQUECI SENHA
export async function forgotPassword(req, res) {
  try {
    let { email } = req.body;
    email = normalizeEmail(email);

    if (!email) {
      return res.status(400).json({ message: "Email é obrigatório" });
    }

    const pool = getPool();

    // Busca usuário
    const result = await pool.request()
      .input("email", sql.NVarChar, email)
      .query("SELECT id, nome, email FROM Usuarios WHERE email = @email");

    const usuario = result.recordset[0];

    // Se não existir, retornamos sucesso por segurança
    if (!usuario) {
      return res.json({
        message: "Se o email estiver cadastrado, enviaremos instruções",
      });
    }

    // Gera token aleatório (código curto para facilitar ou token longo para link)
    // Vou usar um token longo para o link de redefinição
    const token = crypto.randomBytes(32).toString("hex");

    // Define expiração (15 minutos)
    const exp = new Date(Date.now() + 1000 * 60 * 15);

    // Salva no banco
    await pool.request()
      .input("token", sql.VarChar, token)
      .input("exp", sql.DateTime, exp)
      .input("id", sql.Int, usuario.id)
      .query(`
        UPDATE Usuarios
        SET resetToken = @token,
            resetTokenExp = @exp
        WHERE id = @id
      `);

    // Envia o email
    const linkRedefinicao = `http://localhost:3000/resetar-senha?token=${token}`;
    const emailEnviado = await enviarEmailRecuperacao(usuario.email, linkRedefinicao);

    if (!emailEnviado) {
      // Se falhou o envio mas salvou no banco, logamos mas avisamos o usuário
      console.error("Falha ao enviar email para:", usuario.email);
    }

    res.json({
      message: "Se o email estiver cadastrado, enviaremos instruções",
    });

  } catch (error) {
    console.error("❌ ERRO forgotPassword:", error);
    res.status(500).json({ message: "Erro ao processar recuperação" });
  }
}

//  RESETAR SENHA
export async function resetPassword(req, res) {
  try {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
      return res.status(400).json({ message: "Dados incompletos" });
    }

    if (String(novaSenha).length < 8) {
      return res.status(400).json({ message: "Senha deve ter 8+ caracteres" });
    }

    const pool = getPool();

    // Busca usuário com token válido
    const result = await pool.request()
      .input("token", sql.VarChar, token)
      .query(`
        SELECT id FROM Usuarios
        WHERE resetToken = @token
        AND resetTokenExp > GETDATE()
      `);

    const usuario = result.recordset[0];

    if (!usuario) {
      return res.status(400).json({ message: "Token inválido ou expirado" });
    }

    // Criptografa nova senha
    const hash = await bcrypt.hash(novaSenha, 10);

    // Atualiza
    await pool.request()
      .input("senha", sql.NVarChar, hash)
      .input("id", sql.Int, usuario.id)
      .query(`
        UPDATE Usuarios
        SET senha = @senha,
            resetToken = NULL,
            resetTokenExp = NULL
        WHERE id = @id
      `);

    res.json({ message: "Senha redefinida com sucesso!" });

  } catch (error) {
    console.error("❌ ERRO RESET:", error);
    res.status(500).json({ message: "Erro ao redefinir senha" });
  }
}

//  PERFIL (ROTA PROTEGIDA)
export async function getPerfil(req, res) {
  try {
    const pool = getPool();

    // Usa o ID vindo do token (middleware de autenticação)
    const result = await pool.request()
      .input("id", sql.Int, req.usuario.id)
      .query(`
        SELECT 
          Id as id,
          Nome as nome,
          Email as email,
          Idade as idade,
          Peso as peso,
          Altura as altura,
          Sexo as sexo
        FROM Usuarios
        WHERE Id = @id
      `);

    const usuario = result.recordset[0];

    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Retorna dados do perfil
    res.json(usuario);

  } catch (error) {
    console.error("❌ ERRO PERFIL:", error);
    res.status(500).json({ message: "Erro ao buscar perfil" });
  }
}

//  ATUALIZAR PERFIL (ROTA PROTEGIDA) - peso/altura
export async function updatePerfil(req, res) {
  try {
    const id = req.usuario?.id;
    if (!id) {
      return res.status(401).json({ message: "Não autorizado" });
    }

    const { peso, altura } = req.body ?? {};

    const hasPeso = Object.prototype.hasOwnProperty.call(req.body ?? {}, "peso");
    const hasAltura = Object.prototype.hasOwnProperty.call(req.body ?? {}, "altura");

    if (!hasPeso && !hasAltura) {
      return res.status(400).json({ message: "Envie ao menos peso ou altura" });
    }

    // Aceita undefined/ausente (não altera). Se vier valor, valida.
    if (hasPeso && peso !== undefined && peso !== null) {
      const p = Number(peso);
      if (!Number.isFinite(p) || p <= 0) {
        return res.status(400).json({ message: "Peso inválido" });
      }
    }

    if (hasAltura && altura !== undefined && altura !== null) {
      const a = Number(altura);
      if (!Number.isFinite(a) || a <= 0) {
        return res.status(400).json({ message: "Altura inválida" });
      }
    }

    const pool = getPool();

    // Atualiza somente o que vier no body (se não vier, mantém).
    await pool.request()
      .input("id", sql.Int, id)
      .input(
        "peso",
        sql.Decimal(10, 2),
        hasPeso ? (peso === null ? null : (peso === undefined ? null : Number(peso))) : null
      )
      .input(
        "altura",
        sql.Decimal(10, 2),
        hasAltura ? (altura === null ? null : (altura === undefined ? null : Number(altura))) : null
      )
      .query(`
        UPDATE Usuarios
        SET
          Peso = CASE WHEN @peso IS NULL AND ${hasPeso ? 1 : 0} = 0 THEN Peso ELSE COALESCE(@peso, Peso) END,
          Altura = CASE WHEN @altura IS NULL AND ${hasAltura ? 1 : 0} = 0 THEN Altura ELSE COALESCE(@altura, Altura) END
        WHERE Id = @id
      `);

    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        SELECT 
          Id as id,
          Nome as nome,
          Email as email,
          Idade as idade,
          Peso as peso,
          Altura as altura
        FROM Usuarios
        WHERE Id = @id
      `);

    const usuario = result.recordset[0];
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    return res.json(usuario);
  } catch (error) {
    console.error("❌ ERRO UPDATE PERFIL:", error);
    return res.status(500).json({ message: "Erro ao atualizar perfil" });
  }
}

//  DESATIVAR CONTA
export async function desativarConta(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const pool = getPool();

    await pool.request()
      .input("id", sql.Int, usuarioId)
      .query("UPDATE Usuarios SET situacao = 'desativado' WHERE id = @id");

    res.json({ message: "Conta desativada com sucesso" });
  } catch (error) {
    console.error("❌ ERRO AO DESATIVAR CONTA:", error);
    res.status(500).json({ message: "Erro ao desativar conta" });
  }
}

//  REDEFINIR SENHA (LOGADO)
export async function redefinirSenhaLogado(req, res) {
  try {
    const { novaSenha } = req.body;
    const usuarioId = req.usuario.id;

    if (!novaSenha) {
      return res.status(400).json({ message: "Nova senha é obrigatória" });
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    const pool = getPool();

    await pool.request()
      .input("id", sql.Int, usuarioId)
      .input("senha", sql.NVarChar, senhaHash)
      .query("UPDATE Usuarios SET senha = @senha WHERE id = @id");

    res.json({ message: "Senha redefinida com sucesso" });
  } catch (error) {
    console.error("❌ ERRO AO REDEFINIR SENHA:", error);
    res.status(500).json({ message: "Erro ao redefinir senha" });
  }
}

//  LOGIN / CADASTRO COM GOOGLE
export async function googleLogin(req, res) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token do Google não fornecido" });
    }

    // Valida o token com o Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    const emailNormalizado = normalizeEmail(email);
    const pool = getPool();

    // Verifica se o usuário já existe
    let result = await pool.request()
      .input("email", sql.NVarChar, emailNormalizado)
      .query(`
        SELECT id, nome, email, situacao, sexo
        FROM Usuarios
        WHERE email = @email
      `);

    let usuario = result.recordset[0];

    // Se não existir, cria um novo usuário
    if (!usuario) {
      // Gera uma senha aleatória segura (que o usuário nunca usará diretamente)
      const senhaDummy = crypto.randomBytes(16).toString("hex");
      const senhaHash = await bcrypt.hash(senhaDummy, 10);

      const insertResult = await pool.request()
        .input("nome", sql.NVarChar, name)
        .input("email", sql.NVarChar, emailNormalizado)
        .input("senha", sql.NVarChar, senhaHash)
        .query(`
          INSERT INTO Usuarios (nome, email, senha)
          OUTPUT INSERTED.id, INSERTED.nome, INSERTED.email, INSERTED.sexo
          VALUES (@nome, @email, @senha)
        `);

      usuario = insertResult.recordset[0];
    }

    // Verifica se a conta está desativada
    if (usuario.situacao === 'desativado') {
      return res.status(403).json({
        message: "Esta conta está desativada. Entre em contato com o suporte para reativar.",
      });
    }

    // Gera o token JWT da nossa aplicação
    const jwtToken = jwt.sign(
      { id: usuario.id, email: usuario.email },
      SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login com Google realizado com sucesso",
      token: jwtToken,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        sexo: usuario.sexo
      },
    });

  } catch (error) {
    console.error("❌ ERRO GOOGLE LOGIN:", error);
    res.status(500).json({ message: "Erro ao processar login com Google" });
  }
}