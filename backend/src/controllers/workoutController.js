import { db } from "../config/knex.js";

// SALVAR TREINO E HISTÓRICO EM UMA ÚNICA VEZ (AO FINALIZAR)
export async function finalizarTreinoCompleto(req, res) {
  try {
    const { tipo, diaSemana, exerciciosRealizados } = req.body;
    const usuarioId = Number(req.usuario.id);

    if (!tipo || !exerciciosRealizados || !diaSemana) {
      return res.status(400).json({ message: "Dados incompletos" });
    }

    await db.transaction(async (trx) => {
      const nomesExercicios = exerciciosRealizados.map(ex => ex.nome).join(", ");
      const tipoFormatado = tipo.charAt(0).toUpperCase() + tipo.slice(1);
      const nomeTreino = `Treino ${tipoFormatado}`;

      // 1. cria treino
      const [treino] = await trx("Treinos")
        .insert({
          nome: nomeTreino,
          descricao: nomesExercicios
        })
        .returning(["id"]);

      const treinoId = treino.id;

      // 2. exercícios
      for (const ex of exerciciosRealizados) {
        let exercicio = await trx("Exercicios")
          .where({ nome: ex.nome })
          .first();

        if (!exercicio) {
          const [novo] = await trx("Exercicios")
            .insert({ nome: ex.nome })
            .returning(["id"]);

          exercicio = novo;
        }

        await trx("TreinoExercicios").insert({
          treinoId,
          exercicioId: exercicio.id,
          series: Number(ex.series) || 3,
          repeticoes: parseInt(String(ex.repeticoes).split("-")[0]) || 12
        });
      }

      // 3. vínculo usuário
      await trx("UsuarioTreinos").insert({
        usuarioId,
        treinoId,
        diaSemana: String(diaSemana)
      });

      // 4. histórico
      await trx("HistoricoTreinos").insert({
        usuarioId,
        treinoId,
        dataTreino: new Date()
      });

      res.status(201).json({
        message: "Treino e histórico salvos com sucesso!",
        treinoId
      });
    });

  } catch (error) {
    console.error("❌ ERRO AO FINALIZAR TREINO:", error);
    res.status(500).json({ message: "Erro ao salvar treino" });
  }
}

// LISTAR TREINOS DO USUÁRIO (COM EXERCÍCIOS)
export async function listarTreinos(req, res) {
  try {
    const usuarioId = req.usuario.id;

    const rows = await db("UsuarioTreinos as ut")
      .join("Treinos as t", "ut.treinoId", "t.id")
      .join("TreinoExercicios as te", "t.id", "te.treinoId")
      .join("Exercicios as e", "te.exercicioId", "e.id")
      .where("ut.usuarioId", usuarioId)
      .select(
        "t.id as TreinoId",
        "t.nome as TreinoNome",
        "ut.diaSemana",
        "e.nome as ExercicioNome",
        "te.series",
        "te.repeticoes"
      );

    const treinos = rows.reduce((acc, curr) => {
      let treino = acc.find(t => t.id === curr.TreinoId);

      if (!treino) {
        treino = {
          id: curr.TreinoId,
          nome: curr.TreinoNome,
          diaSemana: curr.diaSemana,
          exercicios: []
        };
        acc.push(treino);
      }

      treino.exercicios.push({
        nome: curr.ExercicioNome,
        series: curr.series,
        repeticoes: curr.repeticoes
      });

      return acc;
    }, []);

    res.json(treinos);

  } catch (error) {
    console.error("❌ ERRO AO LISTAR TREINOS:", error);
    res.status(500).json({ message: "Erro ao listar treinos" });
  }
}

// SALVAR HISTÓRICO DE TREINO
export async function salvarHistorico(req, res) {
  try {
    const { treinoId } = req.body;
    const usuarioId = req.usuario.id;

    if (!treinoId) {
      return res.status(400).json({ message: "ID do treino é obrigatório" });
    }

    await db("HistoricoTreinos").insert({
      usuarioId,
      treinoId,
      dataTreino: new Date()
    });

    res.status(201).json({ message: "Treino registrado no histórico!" });

  } catch (error) {
    console.error("❌ ERRO AO SALVAR HISTÓRICO:", error);
    res.status(500).json({ message: "Erro ao salvar histórico" });
  }
}

// LISTAR HISTÓRICO
export async function listarHistorico(req, res) {
   try {
    const usuarioId = req.usuario.id;

    const historico = await db("HistoricoTreinos as h")
      .join("Treinos as t", "h.treinoId", "t.id")
      .where("h.usuarioId", usuarioId)
      .select(
        "h.id",
        "h.dataTreino",
        "t.nome as NomeTreino",
        "t.descricao as ExerciciosRealizados"
      )
      .orderBy("h.dataTreino", "desc");

    res.json(historico);

  } catch (error) {
    console.error("❌ ERRO AO LISTAR HISTÓRICO:", error);
    res.status(500).json({ message: "Erro ao listar histórico" });
  }
}
