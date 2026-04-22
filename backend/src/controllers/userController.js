import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { db } from "../config/knex.js";
import { enviarEmailRecuperacao } from "../config/email.js";

// Chave secreta usada para assinar e verificar os tokens JWT
const SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Instância do cliente OAuth2 do Google, configurada com o client_id da aplicação
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Falha rápida no boot: se a variável não estiver definida, o servidor não deve subir.
// Evita que tokens sejam assinados com chave undefined (o que criaria uma vulnerabilidade grave).
if (!SECRET) {
  throw new Error("JWT_SECRET não definido no .env");
}

/**
 * Normaliza um endereço de e-mail para comparação consistente no banco.
 *
 * Remove espaços acidentais e converte para minúsculas antes de qualquer
 * consulta ou inserção, evitando duplicidade por variações de capitalização
 * (ex: "User@Email.com" e "user@email.com" seriam tratados como iguais).
 */
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Valida o campo `fotoPerfil` antes de persistir no banco de dados.
 *
 * Regras aplicadas:
 * - `undefined`: campo não enviado, nenhuma alteração necessária → ok.
 * - `null` ou `""`: remoção intencional da foto → ok.
 * - Tipo não-string: dado corrompido ou inválido → erro.
 * - String com mais de 3000000 caracteres: base64 muito grande que pode
 *   sobrecarregar o banco e a rede → erro com mensagem amigável.
 *
 * Retorna `{ ok: true }` para casos válidos ou `{ ok: false, message }` para inválidos.
 */
function validarFotoPerfil(fotoPerfil) {
  if (fotoPerfil === undefined) {
    return { ok: true };
  }
  if (fotoPerfil === null || fotoPerfil === "") {
    return { ok: true };
  } 
  if (typeof fotoPerfil !== "string") {
    return { ok: false, message: "Foto de perfil inválida" };
  }

  if (fotoPerfil.length > 3_000_000) {
    return { ok: false, message: "Imagem muito grande. Use uma foto menor." };
  }

  return { ok: true };
}

/**
 * Cadastra um novo usuário na aplicação.
 *
 * Fluxo:
 * 1. Normaliza nome e e-mail para evitar duplicidades por formatação.
 * 2. Valida campos obrigatórios (nome, email, senha).
 * 3. Verifica se o e-mail já está em uso para retornar erro descritivo.
 * 4. Gera hash da senha com bcrypt (fator 10) antes de salvar — nunca armazena senha em texto puro.
 * 5. Insere o usuário e retorna apenas os campos não sensíveis (id, nome, email).
 */
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

    // Consulta prévia para evitar unique constraint error no banco,
    // retornando uma mensagem de erro mais clara ao cliente.
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

/**
 * Autentica um usuário com e-mail e senha e retorna um token JWT.
 *
 * Fluxo:
 * 1. Normaliza o e-mail para garantir consistência com o cadastro.
 * 2. Busca o usuário no banco; retorna 401 com mensagem genérica se não encontrado
 *    (evita enumerar quais e-mails existem no sistema — security best practice).
 * 3. Bloqueia contas com situação "desativado" antes de verificar a senha.
 * 4. Compara a senha fornecida com o hash armazenado via bcrypt.
 * 5. Gera um JWT com validade de 1h contendo apenas id e email (sem dados sensíveis).
 * 6. Retorna o token e os dados públicos do usuário para o cliente.
 */
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

    // Mesma mensagem para "não encontrado" e "senha errada" para não vazar
    // informações sobre quais e-mails estão cadastrados no sistema.
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

/**
 * Inicia o fluxo de recuperação de senha via e-mail.
 *
 * Fluxo:
 * 1. Gera um token aleatório criptograficamente seguro (32 bytes → 64 chars hex).
 * 2. Define expiração de 15 minutos para limitar a janela de uso do token.
 * 3. Salva o token e sua expiração no banco vinculados ao usuário.
 * 4. Envia o e-mail com o link de redefinição.
 *
 * Segurança: retorna a mesma mensagem independente de o e-mail existir ou não,
 * prevenindo enumeração de usuários cadastrados por parte de atacantes.
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

    // Resposta genérica mesmo quando o usuário não existe — evita enumeração de contas.
    if (!usuario) {
      return res.json({
        message: "Se o email estiver cadastrado, enviaremos instruções",
      });
    }

    // Token seguro gerado com crypto para não ser previsível ou forjável
    const token = crypto.randomBytes(32).toString("hex");
    // Expiração de 15 minutos a partir do momento atual
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

/**
 * Redefine a senha de um usuário via token de recuperação.
 *
 * Fluxo:
 * 1. Valida presença dos campos obrigatórios (token e novaSenha).
 * 2. Busca o usuário cujo token coincide E ainda não expirou (data > agora).
 *    A checagem de expiração é feita diretamente no SQL para consistência.
 * 3. Gera o hash da nova senha e atualiza o banco.
 * 4. Invalida o token após uso (null) para impedir reutilização — one-time use.
 */
export async function resetPassword(req, res) {
  try {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
      return res.status(400).json({ message: "Dados incompletos" });
    }

    // A condição `resetTokenExp > now` garante que tokens expirados sejam rejeitados
    const usuario = await db("Usuarios")
      .where("resetToken", token)
      .andWhere("resetTokenExp", ">", new Date())
      .first();

    if (!usuario) {
      return res.status(400).json({ message: "Token inválido ou expirado" });
    }

    const hash = await bcrypt.hash(novaSenha, 10);

    // Zera o token após uso para que o mesmo link não possa ser reutilizado
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

/**
 * Retorna os dados do perfil do usuário autenticado.
 *
 * O id do usuário é extraído do token JWT pelo middleware de autenticação
 * e disponibilizado em `req.usuario.id` — nunca confia no body da requisição.
 * Seleciona apenas os campos necessários para não expor dados sensíveis (ex: senha, resetToken).
 */
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
        "sexo",
        "fotoPerfil"
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

/**
 * Atualiza parcialmente o perfil do usuário autenticado (peso, altura e/ou foto).
 *
 * Usa PATCH semântico: apenas os campos enviados no body são atualizados.
 * Campos ausentes (undefined) são ignorados — o banco não recebe o campo.
 * Isso evita sobrescrever acidentalmente valores existentes com null.
 *
 * Fluxo por campo:
 * - `peso` / `altura`: converte para Number e valida que é finito e positivo.
 * - `fotoPerfil`: delega a validação para `validarFotoPerfil` (tipo, tamanho).
 *
 * Após a atualização, rebusca o usuário completo para retornar os dados atualizados,
 * garantindo que o cliente receba os valores efetivamente persistidos no banco.
 */
export async function updatePerfil(req, res) {
  try {
    const id = req.usuario.id;
    const { peso, altura, fotoPerfil } = req.body;

    // Objeto construído dinamicamente: só recebe os campos que foram enviados
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
      // Converte string vazia para null para não salvar valor vazio no banco
      updateData.fotoPerfil = fotoPerfil || null;
    }

    await db("Usuarios")
      .where({ id })
      .update(updateData);

    // Rebusca o registro atualizado para retornar os dados reais do banco ao cliente
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
 * Desativa a conta do usuário autenticado (soft delete).
 *
 * Usa soft delete (situacao = "desativado") em vez de deletar o registro,
 * preservando o histórico de treinos e dados associados.
 * O login bloqueará contas desativadas antes de validar a senha.
 */
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

/**
 * Redefine a senha do usuário já autenticado (fluxo logado).
 *
 * Diferente do `resetPassword` (fluxo por token de e-mail), esta rota
 * exige autenticação via JWT, portanto não precisa validar token de recuperação.
 * O id do usuário vem do middleware de autenticação, não do body da requisição.
 * A nova senha é hashada com bcrypt antes de ser salva.
 */
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

/**
 * Autentica ou cadastra um usuário via login social do Google (OAuth2).
 *
 * Fluxo:
 * 1. Recebe o `idToken` gerado pelo SDK do Google no frontend.
 * 2. Verifica a assinatura e validade do token com a biblioteca oficial do Google,
 *    garantindo que o token não foi forjado e pertence à nossa aplicação.
 * 3. Extrai e-mail e nome do payload verificado.
 * 4. Busca o usuário no banco pelo e-mail normalizado.
 *    - Se não existir: cria automaticamente com uma senha aleatória inutilizável
 *      (o usuário nunca precisará desta senha, pois acessa via Google).
 *    - Se existir: segue para geração do JWT.
 * 5. Bloqueia contas desativadas antes de emitir o token.
 * 6. Retorna JWT e dados públicos do usuário, igual ao fluxo de login convencional.
 *
 * A senha dummy usa `crypto.randomBytes` para ser criptograficamente segura
 * e impossível de adivinhar, caso alguém tente fazer login convencional com o e-mail.
 */
export async function googleLogin(req, res) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token do Google não fornecido" });
    }

    // Verificação criptográfica do token junto aos servidores do Google
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

    // Cadastro automático (just-in-time provisioning): cria o usuário na primeira vez
    // que faz login com Google, sem necessidade de fluxo de cadastro separado.
    if (!usuario) {
      // Senha aleatória e inutilizável: impede login convencional com este e-mail
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

    // Verifica desativação após o upsert para cobrir tanto usuários novos quanto existentes
    if (usuario.situacao && usuario.situacao === "desativado") {
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