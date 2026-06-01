import { db } from "../config/knex.js";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function hoje() {
  return new Date();
}

/** Dias entre duas datas (sem fração) */
function diasEntre(dataA, dataB) {
  const diff = dataB.getTime() - dataA.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Dias até o próximo aniversário.
 * Retorna 0 se for hoje, negativo se já passou este ano mas ainda não passou 365 dias.
 */
function diasParaProximoAniversario(dataNascimento) {
  const agora = hoje();
  const nascimento = new Date(dataNascimento);

  // Aniversário deste ano
  const aniversarioEsteAno = new Date(
    agora.getFullYear(),
    nascimento.getMonth(),
    nascimento.getDate()
  );

  let diff = diasEntre(agora, aniversarioEsteAno);

  // Se já passou este ano, calcula para o próximo ano
  if (diff < 0) {
    const aniversarioProximoAno = new Date(
      agora.getFullYear() + 1,
      nascimento.getMonth(),
      nascimento.getDate()
    );
    diff = diasEntre(agora, aniversarioProximoAno);
  }

  return diff;
}

function calcularIdade(dataNascimento) {
  const agora = hoje();
  const nasc = new Date(dataNascimento);
  let idade = agora.getFullYear() - nasc.getFullYear();
  const mPassou = agora.getMonth() > nasc.getMonth() ||
    (agora.getMonth() === nasc.getMonth() && agora.getDate() >= nasc.getDate());
  if (!mPassou) idade--;
  return idade;
}

// ─── Queries ───────────────────────────────────────────────────────────────────

/** Aniversariantes nos próximos N dias (padrão: 7) */
async function buscarAniversariantes(diasJanela = 7) {
  const usuarios = await db("Usuarios")
    .select("id", "nome", "email", "fotoPerfil", "dataNascimento")
    .whereNotNull("dataNascimento")
    .where("role", "aluno")
    .whereNot("situacao", "desativado");

  const resultado = [];

  for (const u of usuarios) {
    const dias = diasParaProximoAniversario(u.dataNascimento);
    if (dias >= 0 && dias <= diasJanela) {
      resultado.push({
        tipo: "aniversario",
        usuarioId: u.id,
        nome: u.nome,
        email: u.email,
        fotoPerfil: u.fotoPerfil,
        dataNascimento: u.dataNascimento,
        diasParaAniversario: dias,
        idade: calcularIdade(u.dataNascimento) + (dias === 0 ? 0 : 1), // já conta a idade que vai fazer
      });
    }
  }

  // Ordena: hoje primeiro, depois pelos mais próximos
  resultado.sort((a, b) => a.diasParaAniversario - b.diasParaAniversario);
  return resultado;
}

/** Mensalidades atrasadas + vencendo nos próximos 3 dias */
async function buscarMensalidadesCriticas() {
  const agora = hoje();
  const em3Dias = new Date(agora);
  em3Dias.setDate(em3Dias.getDate() + 3);

  const dataLimite = em3Dias.toISOString().split("T")[0];

  const rows = await db("Mensalidades as m")
    .join("Usuarios as u", "u.id", "m.usuarioId")
    .select(
      "m.id as mensalidadeId",
      "m.usuarioId",
      "m.valor",
      "m.vencimento",
      "m.status",
      "u.nome",
      "u.email",
      "u.fotoPerfil"
    )
    .whereIn("m.status", ["pendente", "atrasado"])
    .where("m.vencimento", "<=", dataLimite)
    .whereNot("u.situacao", "desativado")
    .orderBy("m.vencimento", "asc");

  return rows.map((r) => {
    // PostgreSQL pode retornar vencimento como objeto Date — normaliza para string YYYY-MM-DD
    const vencStr = r.vencimento instanceof Date
      ? r.vencimento.toISOString().split("T")[0]
      : String(r.vencimento).split("T")[0];

    const vencimento = new Date(vencStr + "T12:00:00");
    const diasAtraso = Math.max(0, diasEntre(vencimento, agora));
    const diasParaVencer = Math.max(0, diasEntre(agora, vencimento));
    const atrasado = vencimento < agora;

    return {
      tipo: atrasado ? "mensalidade_atrasada" : "mensalidade_vencendo",
      usuarioId: r.usuarioId,
      mensalidadeId: r.mensalidadeId,
      nome: r.nome,
      email: r.email,
      fotoPerfil: r.fotoPerfil,
      valor: parseFloat(r.valor),
      vencimento: vencStr,
      diasAtraso: atrasado ? diasAtraso : undefined,
      diasParaVencer: !atrasado ? diasParaVencer : undefined,
    };
  });
}

/** Alunos sem treinar há mais de N dias (padrão: 7) */
async function buscarSemTreinar(diasMinimo = 7) {
  const agora = hoje();
  const limiteData = new Date(agora);
  limiteData.setDate(limiteData.getDate() - diasMinimo);
  const limiteDateStr = limiteData.toISOString().split("T")[0];

  // Pega todos os alunos ativos com o último treino
  const rows = await db("Usuarios as u")
    .leftJoin(
      db.raw(`(
        SELECT "usuarioId", MAX("dataTreino") as "ultimoTreino"
        FROM "HistoricoTreinos"
        GROUP BY "usuarioId"
      ) as ht`),
      "ht.usuarioId", "u.id"
    )
    .select(
      "u.id as usuarioId",
      "u.nome",
      "u.email",
      "u.fotoPerfil",
      "ht.ultimoTreino"
    )
    .where("u.role", "aluno")
    .whereNot("u.situacao", "desativado")
    .where(function () {
      this.whereNull("ht.ultimoTreino").orWhere("ht.ultimoTreino", "<", limiteDateStr);
    });

  const resultado = rows.map((r) => {
    const diasSemTreinar = r.ultimoTreino
      ? diasEntre(new Date(r.ultimoTreino + "T12:00:00"), agora)
      : 999; // nunca treinou — aparece primeiro
    return {
      tipo: "sem_treinar",
      usuarioId: r.usuarioId,
      nome: r.nome,
      email: r.email,
      fotoPerfil: r.fotoPerfil,
      ultimoTreino: r.ultimoTreino ?? null,
      diasSemTreinar,
    };
  });

  // Mais críticos primeiro (mais dias sem treinar)
  resultado.sort((a, b) => b.diasSemTreinar - a.diasSemTreinar);
  return resultado;
}

// ─── Handler ───────────────────────────────────────────────────────────────────

export async function listarAlertas(req, res) {
  try {
    const [aniversarios, mensalidadesCriticas, semTreinar] = await Promise.all([
      buscarAniversariantes(7),
      buscarMensalidadesCriticas(),
      buscarSemTreinar(7),
    ]);

    return res.json({ aniversarios, mensalidadesCriticas, semTreinar });
  } catch (err) {
    console.error("Erro ao listar alertas:", err);
    return res.status(500).json({ error: "Erro interno ao buscar alertas." });
  }
}