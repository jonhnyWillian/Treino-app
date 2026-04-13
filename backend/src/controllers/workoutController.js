import { sql, getPool } from "../config/db.js";

// SALVAR TREINO E HISTÓRICO EM UMA ÚNICA VEZ (AO FINALIZAR)
export async function finalizarTreinoCompleto(req, res) {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);
  
  try {
    const { tipo, diaSemana, exerciciosRealizados } = req.body;
    const usuarioId = Number(req.usuario.id);

    if (!tipo || !exerciciosRealizados || !diaSemana) {
      return res.status(400).json({ message: "Dados incompletos para finalizar o treino" });
    }

    await transaction.begin();

    try {
      // 1. Criar a definição do Treino (Nome = Treino + Tipo, Descrição = Nomes dos Exercícios)
      const nomesExercicios = exerciciosRealizados.map(ex => ex.nome).join(", ");
      const tipoFormatado = String(tipo).charAt(0).toUpperCase() + String(tipo).slice(1);
      const nomeTreino = `Treino ${tipoFormatado}`;

      const workoutRequest = new sql.Request(transaction);
      const workoutResult = await workoutRequest
        .input("nome", sql.NVarChar, nomeTreino)
        .input("descricao", sql.NVarChar, nomesExercicios)
        .query("INSERT INTO Treinos (nome, descricao) OUTPUT INSERTED.id VALUES (@nome, @descricao)");
      
      const treinoId = workoutResult.recordset[0].id;

      // 2. Processar exercícios e vincular ao treino
      for (const ex of exerciciosRealizados) {
        // Busca ou cria o exercício
        const searchRequest = new sql.Request(transaction);
        let exResult = await searchRequest
          .input("nome", sql.NVarChar, String(ex.nome))
          .query("SELECT id FROM Exercicios WHERE nome = @nome");
        
        let exercicioId;
        if (exResult.recordset.length > 0) {
          exercicioId = exResult.recordset[0].id;
        } else {
          const insertExRequest = new sql.Request(transaction);
          const newEx = await insertExRequest
            .input("nome", sql.NVarChar, String(ex.nome))
            .query("INSERT INTO Exercicios (nome) OUTPUT INSERTED.id VALUES (@nome)");
          exercicioId = newEx.recordset[0].id;
        }

        // Vincula em TreinoExercicios (mesmo se não foi concluído, faz parte da definição do que foi tentado)
        const linkRequest = new sql.Request(transaction);
        await linkRequest
          .input("treinoId", sql.Int, treinoId)
          .input("exercicioId", sql.Int, exercicioId)
          .input("series", sql.Int, Number(ex.series) || 3)
          .input("repeticoes", sql.Int, parseInt(String(ex.repeticoes).split("-")[0]) || 12)
          .query(`
            INSERT INTO TreinoExercicios (treinoId, exercicioId, series, repeticoes)
            VALUES (@treinoId, @exercicioId, @series, @repeticoes)
          `);
      }

      // 3. Vincular Treino ao Usuário
      const userWorkoutRequest = new sql.Request(transaction);
      await userWorkoutRequest
        .input("usuarioId", sql.Int, usuarioId)
        .input("treinoId", sql.Int, treinoId)
        .input("diaSemana", sql.NVarChar, String(diaSemana))
        .query(`
          INSERT INTO UsuarioTreinos (usuarioId, treinoId, diaSemana)
          VALUES (@usuarioId, @treinoId, @diaSemana)
        `);

      // 4. Salvar no Histórico
      const historyRequest = new sql.Request(transaction);
      await historyRequest
        .input("usuarioId", sql.Int, usuarioId)
        .input("treinoId", sql.Int, treinoId)
        .query(`
          INSERT INTO HistoricoTreinos (usuarioId, treinoId, dataTreino)
          VALUES (@usuarioId, @treinoId, GETDATE())
        `);

      await transaction.commit();
      res.status(201).json({ message: "Treino e histórico salvos com sucesso!", treinoId });

    } catch (innerError) {
      console.error("❌ ERRO INTERNO NA TRANSAÇÃO:", innerError);
      if (!transaction._aborted) {
        await transaction.rollback();
      }
      throw innerError;
    }
  } catch (error) {
    console.error("❌ ERRO GERAL AO FINALIZAR TREINO:", error);
    res.status(500).json({ message: "Erro ao salvar treino e histórico", details: error.message });
  }
}

// LISTAR TREINOS DO USUÁRIO (COM EXERCÍCIOS)
export async function listarTreinos(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const pool = getPool();
    
    const result = await pool.request()
      .input("usuarioId", sql.Int, usuarioId)
      .query(`
        SELECT 
          t.id as TreinoId,
          t.nome as TreinoNome,
          ut.diaSemana,
          e.nome as ExercicioNome,
          te.series,
          te.repeticoes
        FROM UsuarioTreinos ut
        JOIN Treinos t ON ut.treinoId = t.id
        JOIN TreinoExercicios te ON t.id = te.treinoId
        JOIN Exercicios e ON te.exercicioId = e.id
        WHERE ut.usuarioId = @usuarioId
      `);

    const treinos = result.recordset.reduce((acc, curr) => {
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

    const pool = getPool();
    await pool.request()
      .input("usuarioId", sql.Int, usuarioId)
      .input("treinoId", sql.Int, treinoId)
      .query(`
        INSERT INTO HistoricoTreinos (usuarioId, treinoId, dataTreino)
        VALUES (@usuarioId, @treinoId, GETDATE())
      `);

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
    const pool = getPool();
    const result = await pool.request()
      .input("usuarioId", sql.Int, usuarioId)
      .query(`
        SELECT 
          h.id,
          h.dataTreino,
          t.nome as NomeTreino,
          t.descricao as ExerciciosRealizados,
          (SELECT COUNT(*) FROM TreinoExercicios WHERE treinoId = t.id) as QtdExercicios
        FROM HistoricoTreinos h
        JOIN Treinos t ON h.treinoId = t.id
        WHERE h.usuarioId = @usuarioId
        ORDER BY h.dataTreino DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error("❌ ERRO AO LISTAR HISTÓRICO:", error);
    res.status(500).json({ message: "Erro ao listar histórico" });
  }
}
