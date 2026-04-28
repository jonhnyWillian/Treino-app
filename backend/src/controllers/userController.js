import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { db } from "../config/knex.js";
import { enviarEmailRecuperacao } from "../config/email.js";

// ─── Configuração ────────────────────────────────────────────────────────────

const SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Fator de custo do bcrypt centralizado aqui para facilitar ajuste futuro.
// Aumentar esse valor torna o hash mais lento e resistente a brute-force,
// mas também aumenta o tempo de resposta do servidor — 10 é o padrão seguro.
const BCRYPT_SALT_ROUNDS = 10;

// Comprimento mínimo aceito para qualquer senha da aplicação.
// Centralizado para que cadastro, reset e redefinição usem a mesma regra.
const SENHA_MIN_LENGTH = 8;

// Instância do cliente OAuth2 do Google usada para verificar tokens de login social.
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Falha rápida no boot: se JWT_SECRET não estiver definido, o processo encerra antes
// de aceitar qualquer requisição. Evita que tokens sejam assinados com `undefined`,
// o que criaria uma vulnerabilidade grave (qualquer pessoa poderia forjar tokens).
if (!SECRET) {
  throw new Error("JWT_SECRET não definido no .env");
}

// ─── Helpers privados ────────────────────────────────────────────────────────

/**
 * Normaliza um e-mail para comparação consistente no banco.
 *
 * Remove espaços acidentais nas bordas e converte para minúsculas antes de
 * qualquer consulta ou inserção. Sem isso, "User@Email.com" e "user@email.com"
 * seriam tratados como contas diferentes, gerando duplicidades silenciosas.
 *
 * @param {string} email
 * @returns {string}
 */
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/**
 * Hasheia uma senha com bcrypt usando o fator de custo centralizado.
 *
 * Centralizar aqui garante que todos os pontos de criação/troca de senha
 * (cadastro, reset por token, redefinição logada, senha dummy do Google)
 * usem sempre o mesmo algoritmo e custo, sem risco de divergência.
 *
 * @param {string} senha - Texto puro a ser hashado.
 * @returns {Promise<string>} Hash bcrypt pronto para armazenar no banco.
 */
function hashSenha(senha) {
  return bcrypt.hash(senha, BCRYPT_SALT_ROUNDS);
}

/**
 * Gera um JWT assinado com o payload mínimo necessário (id e email).
 *
 * Mantemos o payload enxuto para não expor dados sensíveis no token,
 * que é legível por qualquer um que o intercepte (apenas a assinatura é secreta).
 * Validade de 1 hora limita a janela de uso de tokens vazados.
 *
 * Centralizar aqui garante que loginUsuario e googleLogin produzam tokens
 * identicos em formato e expiração, sem risco de divergência futura.
 *
 * @param {{ id: number, email: string }} usuario
 * @returns {string} JWT assinado.
 */
function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, email: usuario.email },
    SECRET,
    { expiresIn: "1h" }
  );
}

/**
 * Valida que a senha atende ao comprimento mínimo da aplicação.
 *
 * Centralizar a regra aqui garante que cadastro, reset e redefinição
 * apliquem exatamente o mesmo critério. Retorna objeto `{ ok, message }`
 * para que o controller possa retornar a resposta HTTP sem lógica extra.
 *
 * @param {string} senha
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
 * Valida o campo `fotoPerfil` antes de persistir no banco.
 *
 * Regras:
 * - `undefined`: campo não enviado, nenhuma alteração necessária → ok.
 * - falsy (null, ""): remoção intencional da foto → ok.
 * - tipo não-string: dado corrompido ou inválido → erro.
 * - string > 3 MB (aprox.): base64 muito grande que sobrecarrega banco e rede → erro.
 *
 * O colapso de `null` e `""` em um único `!foto` é seguro aqui porque
 * ambos representam "remover a foto" — nenhum valor legítimo de foto é falsy.
 *
 * @param {any} fotoPerfil
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
 * Envia a resposta JSON padrão de autenticação bem-sucedida.
 *
 * Centralizar o shape aqui garante que loginUsuario e googleLogin retornem
 * exatamente os mesmos campos ao cliente — sem risco de um ter `sexo` e o
 * outro não, por exemplo. Qualquer mudança futura no contrato da API
 * precisa ser feita em um único lugar.
 *
 * @param {import('express').Response} res
 * @param {string} message - Mensagem descritiva do evento (ex: "Login realizado com sucesso").
 * @param {{ id, nome, email, sexo }} usuario
 * @param {string} token - JWT gerado para a sessão.
 */
function responderLogin(res, message, usuario, token) {
  res.json({
    message,
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      sexo: usuario.sexo,
    },
  });
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * Cadastra um novo usuário na aplicação.
 *
 * Fluxo:
 * 1. Normaliza nome e e-mail para evitar duplicidades por formatação.
 * 2. Valida campos obrigatórios (nome, email, senha) e força da senha.
 * 3. Verifica duplicidade de e-mail antes de inserir, retornando mensagem clara.
 *    (Alternativa seria capturar unique constraint, mas a mensagem ficaria genérica.)
 * 4. Hasheia a senha com bcrypt — nunca armazena texto puro.
 * 5. Insere o usuário e retorna apenas os campos não-sensíveis (id, nome, email).
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
 * Autentica um usuário com e-mail e senha e retorna um JWT.
 *
 * Fluxo:
 * 1. Normaliza o e-mail para consistência com o cadastro.
 * 2. Busca o usuário; retorna 401 com mensagem genérica se não encontrado.
 *    Mesma mensagem para "não existe" e "senha errada" — evita enumerar
 *    quais e-mails estão cadastrados (security best practice).
 * 3. Bloqueia contas desativadas antes de verificar a senha (short-circuit).
 * 4. Compara a senha com o hash via bcrypt.
 * 5. Gera o JWT e retorna via helper centralizado.
 */
export async function loginUsuario(req, res) {
  try {
    let { email, senha } = req.body;
    email = normalizeEmail(email);

    if (!email || !senha) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }

    const usuario = await db("Usuarios").where({ email }).first();

    // Mensagem genérica intencional: não revela se o e-mail existe no sistema.
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
 * Inicia o fluxo de recuperação de senha via e-mail (fluxo deslogado).
 *
 * Fluxo:
 * 1. Gera um token aleatório de 32 bytes (64 chars hex) — criptograficamente seguro.
 * 2. Define expiração de 15 minutos para limitar a janela de uso.
 * 3. Persiste o token e sua expiração vinculados ao usuário.
 * 4. Envia o e-mail com o link de redefinição apontando para APP_URL (não localhost).
 *
 * Retorna a mesma mensagem independente de o e-mail existir ou não,
 * prevenindo que um atacante enumere quais contas estão cadastradas.
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

    // crypto.randomBytes garante que o token seja imprevisível e não forjável.
    const token = crypto.randomBytes(32).toString("hex");
    const exp = new Date(Date.now() + 1000 * 60 * 15);

    await db("Usuarios")
      .where({ id: usuario.id })
      .update({ resetToken: token, resetTokenExp: exp });

    // APP_URL vem do ambiente para funcionar tanto em dev quanto em produção.
    // Hardcodar localhost aqui quebraria os e-mails em staging/produção.
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
 * Redefine a senha via token de recuperação recebido por e-mail (fluxo deslogado).
 *
 * Fluxo:
 * 1. Valida presença dos campos obrigatórios.
 * 2. Valida força da nova senha antes de qualquer operação no banco.
 * 3. Busca o usuário cujo token coincide E ainda não expirou — a checagem de
 *    expiração é feita diretamente no SQL para consistência com o fuso do banco.
 * 4. Hasheia a nova senha e atualiza o registro.
 * 5. Invalida o token após uso (seta null) — garante uso único (one-time use).
 *    Sem isso, o mesmo link poderia ser reutilizado indefinidamente.
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

    // A condição `resetTokenExp > now` garante que tokens expirados sejam rejeitados
    // mesmo que o registro ainda exista no banco.
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

/**
 * Retorna os dados do perfil do usuário autenticado.
 *
 * O id do usuário vem de `req.usuario`, populado pelo middleware de autenticação
 * a partir do JWT — nunca do body da requisição, o que seria inseguro.
 * Seleciona apenas os campos necessários para não expor dados sensíveis
 * (senha, resetToken, resetTokenExp nunca saem nessa rota).
 */
export async function getPerfil(req, res) {
  try {
    const usuario = await db("Usuarios")
      .where({ id: req.usuario.id })
      .select("id", "nome", "email", "idade", "peso", "altura", "sexo", "fotoPerfil")
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
 * Usa semântica PATCH: apenas os campos presentes no body são atualizados.
 * Campos ausentes (undefined) não entram no objeto de update — o banco não
 * recebe o campo e o valor existente é preservado intacto.
 *
 * Fluxo por campo:
 * - `peso` / `altura`: converte para Number e valida que é finito e positivo.
 * - `fotoPerfil`: delega para `validarFotoPerfil` (tipo e tamanho).
 *
 * Após o update, rebusca o registro completo para retornar os valores
 * efetivamente persistidos no banco — evita retornar dados stale do body.
 */
export async function updatePerfil(req, res) {
  try {
    const id = req.usuario.id;
    const { peso, altura, fotoPerfil } = req.body;

    // Objeto construído dinamicamente: só recebe os campos enviados na requisição.
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
      // String vazia convertida para null: evita salvar valor vazio no banco,
      // mantendo consistência com o tipo da coluna (nullable text/bytea).
      updateData.fotoPerfil = fotoPerfil || null;
    }

    await db("Usuarios").where({ id }).update(updateData);

    // Rebusca o registro atualizado para retornar os dados reais do banco.
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
 * Usa soft delete (situacao = "desativado") em vez de DELETE para preservar
 * o histórico de treinos e demais dados associados ao usuário.
 * O controller `loginUsuario` bloqueia contas desativadas antes de validar
 * a senha, impedindo o acesso sem apagar os dados.
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
 * Redefine a senha do usuário já autenticado (fluxo logado).
 *
 * Diferente de `resetPassword` (que usa token de e-mail), esta rota exige
 * um JWT válido — o usuário já está dentro da sessão e quer trocar a senha.
 * O id vem do middleware de autenticação, não do body da requisição.
 * A nova senha passa pela mesma validação de força aplicada no cadastro.
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
 * Autentica ou cadastra um usuário via login social do Google (OAuth2).
 *
 * Fluxo:
 * 1. Recebe o `idToken` gerado pelo SDK do Google no frontend.
 * 2. Verifica a assinatura e validade do token com a biblioteca oficial do Google,
 *    garantindo que não foi forjado e pertence a esta aplicação (audience check).
 * 3. Busca o usuário pelo e-mail normalizado do payload.
 *    - Não existe → cria automaticamente (just-in-time provisioning) com senha
 *      dummy inutilizável, impedindo login convencional com esse e-mail.
 *    - Existe → segue direto para geração do JWT.
 * 4. Bloqueia contas desativadas antes de emitir o token.
 * 5. Retorna JWT e dados públicos via helper centralizado, idêntico ao login convencional.
 *
 * A senha dummy usa crypto.randomBytes para ser criptograficamente imprevisível —
 * ninguém consegue fazer login convencional com esse e-mail mesmo conhecendo o fluxo.
 */
export async function googleLogin(req, res) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token do Google não fornecido" });
    }

    // Verificação criptográfica do token junto aos servidores do Google.
    // audience: garante que o token foi emitido especificamente para esta aplicação.
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });

    const { email, name } = ticket.getPayload();
    const emailNormalizado = normalizeEmail(email);

    let usuario = await db("Usuarios").where({ email: emailNormalizado }).first();

    if (!usuario) {
      // Senha aleatória e inutilizável: impede login convencional com este e-mail,
      // pois ninguém (nem o próprio usuário) conhece essa senha.
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