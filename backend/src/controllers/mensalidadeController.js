import { db } from "../config/knex.js";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function validarData(str) {
  return str && !isNaN(Date.parse(str));
}

/** Calcula status correto com base no vencimento */
function calcularStatus(vencimento) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const venc = new Date(vencimento + "T12:00:00");
  return venc < hoje ? "atrasado" : "pendente";
}

/** Atualiza para "atrasado" mensalidades pendentes já vencidas */
async function atualizarStatusAtrasados() {
  const hoje = new Date().toISOString().split("T")[0];
  await db("Mensalidades")
    .where("status", "pendente")
    .where("vencimento", "<", hoje)
    .update({ status: "atrasado" });
}

// ─── Listar ───────────────────────────────────────────────────────────────────

export async function listarMensalidades(req, res) {
  try {
    await atualizarStatusAtrasados();

    const rows = await db("Mensalidades as m")
      .join("Usuarios as u", "u.id", "m.usuarioId")
      .select(
        "m.id",
        "m.usuarioId",
        "m.valor",
        "m.vencimento",
        "m.status",
        "m.dataPagamento",
        "m.formaPagamento",
        "m.observacao",
        "m.criadoEm",
        "u.nome as nomeCliente",
        "u.email as emailCliente"
      )
      .orderBy("m.vencimento", "desc");

    return res.json(rows);
  } catch (err) {
    console.error("Erro ao listar mensalidades:", err);
    return res.status(500).json({ error: "Erro interno." });
  }
}

// ─── Listar por cliente ────────────────────────────────────────────────────────

export async function listarMensalidadesPorCliente(req, res) {
  const { clienteId } = req.params;

  try {
    await atualizarStatusAtrasados();

    const cliente = await db("Usuarios").where("id", clienteId).first();
    if (!cliente) return res.status(404).json({ message: "Cliente não encontrado." });

    const mensalidades = await db("Mensalidades")
      .where("usuarioId", clienteId)
      .orderBy("vencimento", "desc");

    const resumo = {
      totalPago: mensalidades.filter(m => m.status === "pago").reduce((a, m) => a + parseFloat(m.valor), 0),
      totalPendente: mensalidades.filter(m => m.status === "pendente").reduce((a, m) => a + parseFloat(m.valor), 0),
      totalAtrasado: mensalidades.filter(m => m.status === "atrasado").reduce((a, m) => a + parseFloat(m.valor), 0),
      totalRegistros: mensalidades.length,
    };

    return res.json({
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email,
        fotoPerfil: cliente.fotoPerfil ?? null,
      },
      resumo,
      mensalidades,
    });
  } catch (err) {
    console.error("Erro ao listar mensalidades do cliente:", err);
    return res.status(500).json({ error: "Erro interno." });
  }
}

// ─── Criar ────────────────────────────────────────────────────────────────────

export async function criarMensalidade(req, res) {
  const { usuarioId, valor, vencimento, observacao } = req.body;

  if (!usuarioId || !valor || !vencimento) {
    return res.status(400).json({ message: "usuarioId, valor e vencimento são obrigatórios." });
  }
  if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
    return res.status(400).json({ message: "Valor inválido." });
  }
  if (!validarData(vencimento)) {
    return res.status(400).json({ message: "Data de vencimento inválida." });
  }

  const cliente = await db("Usuarios").where("id", usuarioId).first();
  if (!cliente) return res.status(404).json({ message: "Cliente não encontrado." });
  if (cliente.situacao === "desativado") {
    return res.status(400).json({ message: "Não é possível criar mensalidade para conta desativada." });
  }

  try {
    const [id] = await db("Mensalidades").insert({
      usuarioId,
      valor: parseFloat(valor),
      vencimento,
      status: calcularStatus(vencimento),
      observacao: observacao || null,
    }).returning("id");

    return res.status(201).json({ message: "Mensalidade criada.", id: id.id ?? id });
  } catch (err) {
    console.error("Erro ao criar mensalidade:", err);
    return res.status(500).json({ error: "Erro interno." });
  }
}

// ─── Criar em lote ────────────────────────────────────────────────────────────

export async function criarMensalidadesLote(req, res) {
  const { valor, vencimento, observacao, clienteIds } = req.body;

  if (!valor || !vencimento) {
    return res.status(400).json({ message: "valor e vencimento são obrigatórios." });
  }
  if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
    return res.status(400).json({ message: "Valor inválido." });
  }
  if (!validarData(vencimento)) {
    return res.status(400).json({ message: "Data inválida." });
  }

  try {
    // Se clienteIds vier vazio → aplica para todos os ativos
    let ids = clienteIds && clienteIds.length > 0 ? clienteIds : null;

    const query = db("Usuarios").where("role", "aluno").whereNot("situacao", "desativado");
    if (ids) query.whereIn("id", ids);

    const clientes = await query.select("id");

    if (clientes.length === 0) {
      return res.status(400).json({ message: "Nenhum cliente ativo encontrado." });
    }

    const status = calcularStatus(vencimento);
    const registros = clientes.map(c => ({
      usuarioId: c.id,
      valor: parseFloat(valor),
      vencimento,
      status,
      observacao: observacao || null,
    }));

    await db("Mensalidades").insert(registros);

    return res.status(201).json({
      message: `${registros.length} mensalidade${registros.length !== 1 ? "s" : ""} criada${registros.length !== 1 ? "s" : ""} com sucesso.`,
      quantidade: registros.length,
    });
  } catch (err) {
    console.error("Erro ao criar mensalidades em lote:", err);
    return res.status(500).json({ error: "Erro interno." });
  }
}

// ─── Editar / Registrar pagamento ─────────────────────────────────────────────

export async function editarMensalidade(req, res) {
  const { id } = req.params;
  const { status, dataPagamento, formaPagamento, valor, vencimento, observacao } = req.body;

  try {
    const mensalidade = await db("Mensalidades").where("id", id).first();
    if (!mensalidade) return res.status(404).json({ message: "Mensalidade não encontrada." });

    // ── Fluxo de pagamento ──
    if (status === "pago") {
      if (mensalidade.status === "pago") {
        return res.status(400).json({ message: "Mensalidade já foi paga." });
      }
      if (!dataPagamento) {
        return res.status(400).json({ message: "dataPagamento é obrigatório ao registrar pagamento." });
      }

      await db("Mensalidades").where("id", id).update({
        status: "pago",
        dataPagamento,
        formaPagamento: formaPagamento || null,
      });

      return res.json({ message: "Pagamento registrado com sucesso." });
    }

    // ── Fluxo de edição de dados ──
    if (mensalidade.status === "pago") {
      return res.status(400).json({ message: "Não é possível editar mensalidade já paga." });
    }

    const updates = {};
    if (valor !== undefined) {
      if (isNaN(parseFloat(valor)) || parseFloat(valor) <= 0) {
        return res.status(400).json({ message: "Valor inválido." });
      }
      updates.valor = parseFloat(valor);
    }
    if (vencimento !== undefined) {
      if (!validarData(vencimento)) return res.status(400).json({ message: "Data inválida." });
      updates.vencimento = vencimento;
      updates.status = calcularStatus(vencimento);
    }
    if (observacao !== undefined) updates.observacao = observacao || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "Nenhum campo para atualizar." });
    }

    await db("Mensalidades").where("id", id).update(updates);
    return res.json({ message: "Mensalidade atualizada." });
  } catch (err) {
    console.error("Erro ao editar mensalidade:", err);
    return res.status(500).json({ error: "Erro interno." });
  }
}

// ─── Excluir ──────────────────────────────────────────────────────────────────

export async function excluirMensalidade(req, res) {
  const { id } = req.params;
  try {
    const mensalidade = await db("Mensalidades").where("id", id).first();
    if (!mensalidade) return res.status(404).json({ message: "Mensalidade não encontrada." });

    await db("Mensalidades").where("id", id).del();
    return res.json({ message: "Mensalidade excluída." });
  } catch (err) {
    console.error("Erro ao excluir mensalidade:", err);
    return res.status(500).json({ error: "Erro interno." });
  }
}