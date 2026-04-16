import bcrypt from "bcrypt"; 
import jwt from "jsonwebtoken";
import crypto from "crypto"; 
import { OAuth2Client } from "google-auth-library";
//import { sql, getPool } from "../config/db.js"; // Conexão com banco SQL Server
import { db } from "../config/knex.js";
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
    nome = String(nome || "").trim();
    email = normalizeEmail(email);

    if (!nome || !email || !senha) {
      return res.status(400).json({
        message: "Nome, email e senha são obrigatórios",
      });
    }

    // verifica se já existe
    const userCheck = await db("Usuarios")
      .where({ email })
      .first();

    if (userCheck) {
      return res.status(400).json({
        message: "Email já cadastrado",
      });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const [usuario] = await db("Usuarios")
      .insert({
        nome,
        idade: Number(idade) || null,
        sexo,
        telefone,
        email,
        senha: senhaHash
      })
      .returning(["id", "nome", "email"]);

    res.status(201).json({
      message: "Usuário cadastrado com sucesso",
      usuario,
    });

  } catch (error) {
    console.error("❌ ERRO NO CADASTRO:", error);
    res.status(500).json({
      message: "Erro ao cadastrar usuário",
    });
  }
}

//  LOGIN
export async function loginUsuario(req, res) {
  try {
    let { email, senha } = req.body;

    email = normalizeEmail(email);

    if (!email || !senha) {
      return res.status(400).json({
        message: "Email e senha são obrigatórios",
      });
    }

    const usuario = await db("Usuarios")
      .where({ email })
      .first();

    if (!usuario) {
      return res.status(401).json({
        message: "Email ou senha inválidos",
      });
    }

    if (usuario.situacao === "desativado") {
      return res.status(403).json({
        message: "Conta desativada",
      });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({
        message: "Email ou senha inválidos",
      });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      SECRET,
      { expiresIn: "1h" }
    );

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

    const usuario = await db("Usuarios")
      .where({ email })
      .select("id", "nome", "email")
      .first();

    if (!usuario) {
      return res.json({
        message: "Se o email estiver cadastrado, enviaremos instruções",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const exp = new Date(Date.now() + 1000 * 60 * 15);

    await db("Usuarios")
      .where({ id: usuario.id })
      .update({
        resetToken: token,
        resetTokenExp: exp
      });

    const link = `http://localhost:3000/resetar-senha?token=${token}`;
    await enviarEmailRecuperacao(usuario.email, link);
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
    const usuario = await db("Usuarios")
      .where("resetToken", token)
      .andWhere("resetTokenExp", ">", new Date())
      .first();

    if (!usuario) {
      return res.status(400).json({ message: "Token inválido ou expirado" });
    }

    const hash = await bcrypt.hash(novaSenha, 10);
    await db("Usuarios")
      .where({ id: usuario.id })
      .update({
        senha: hash,
        resetToken: null,
        resetTokenExp: null
      });

    res.json({ message: "Senha redefinida com sucesso!" });

  } catch (error) {
    console.error("❌ ERRO RESET:", error);
    res.status(500).json({ message: "Erro ao redefinir senha" });
  }
}

//  PERFIL (ROTA PROTEGIDA)
export async function getPerfil(req, res) {
  try {
    const usuario = await db("Usuarios")
      .where({ id: req.usuario.id })
      .select(
        "id",
        "nome",
        "email",
        "idade",
        "peso",
        "altura",
        "sexo"
      )
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

//  ATUALIZAR PERFIL (ROTA PROTEGIDA) - peso/altura
export async function updatePerfil(req, res) {
  try {
    const id = req.usuario.id;
    const { peso, altura } = req.body;

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

    await db("Usuarios")
      .where({ id })
      .update(updateData);

    const usuario = await db("Usuarios")
      .where({ id })
      .first();

    res.json(usuario);

  } catch (error) {
    console.error("❌ ERRO UPDATE PERFIL:", error);
    res.status(500).json({ message: "Erro ao atualizar perfil" });
  }
}

//  DESATIVAR CONTA
export async function desativarConta(req, res) {
  try {
    const usuarioId = req.usuario.id;

    await db("Usuarios")
      .where({ id: usuarioId })
      .update({ situacao: "desativado" });

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

    await db("Usuarios")
      .where({ id: usuarioId })
      .update({ senha: senhaHash });

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

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    const emailNormalizado = normalizeEmail(email);

    let usuario = await db("Usuarios")
      .where({ email: emailNormalizado })
      .first();

    // cria usuário se não existir
    if (!usuario) {
      const senhaDummy = crypto.randomBytes(16).toString("hex");
      const senhaHash = await bcrypt.hash(senhaDummy, 10);

      const [novoUsuario] = await db("Usuarios")
        .insert({
          nome: name,
          email: emailNormalizado,
          senha: senhaHash
        })
        .returning(["id", "nome", "email", "sexo"]);

      usuario = novoUsuario;
    }

    if (usuario.situacao === "desativado") {
      return res.status(403).json({
        message: "Conta desativada",
      });
    }

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