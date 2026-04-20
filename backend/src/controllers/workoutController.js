import { db } from "../config/knex.js";

function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function toDecimalOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const normalized = String(value).replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseRepeticoes(value, fallback = 0) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return fallback;
  const first = value.split("-")[0]?.trim();
  return toInt(first, fallback);
}

// SALVAR TREINO E HISTÓRICO EM UMA ÚNICA VEZ (AO FINALIZAR)
export async function finalizarTreinoCompleto(req, res) {
  try {
    const { tipo, diaSemana, exerciciosRealizados, duracaoSegundos } = req.body;
    const usuarioId = Number(req.usuario.id);

    if (!tipo || !Array.isArray(exerciciosRealizados) || exerciciosRealizados.length === 0 || !diaSemana) {
      return res.status(400).json({ message: "Dados incompletos" });
    }

    let treinoId;
    let historicoTreinoId;

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

      treinoId = treino.id;

      // 2. exercícios
      for (let index = 0; index < exerciciosRealizados.length; index += 1) {
        const ex = exerciciosRealizados[index];
        let exercicio = await trx("Exercicios")
          .where({ nome: ex.nome })
          .first();

        if (!exercicio) {
          const [novo] = await trx("Exercicios")
            .insert({
              nome: ex.nome,
              grupoMuscular: ex.grupoMuscular ?? null,
              equipamento: ex.equipamento ?? null,
              categoria: ex.categoria ?? null,
              descricao: ex.descricao ?? null,
              imagemUrl: ex.imagemUrl ?? null,
              videoUrl: ex.videoUrl ?? null
            })
            .returning(["id"]);

          exercicio = novo;
        }

        await trx("TreinoExercicios").insert({
          treinoId,
          exercicioId: exercicio.id,
          series: toInt(ex.series, 3),
          repeticoes: parseRepeticoes(ex.repeticoes, 12),
          descansoSegundos: toInt(ex.descansoSegundos, 0) || null,
          cargaSugerida: toDecimalOrNull(ex.cargaSugerida),
          ordem: toInt(ex.ordem, index + 1)
        });
      }

      // 3. vínculo usuário
      await trx("UsuarioTreinos").insert({
        usuarioId,
        treinoId,
        diaSemana: String(diaSemana)
      });

      // 4. histórico
      const [historico] = await trx("HistoricoTreinos")
        .insert({
          usuarioId,
          treinoId,
          dataTreino: new Date(),
          duracaoSegundos: toInt(duracaoSegundos, 0) || null
        })
        .returning(["id"]);

      historicoTreinoId = historico.id;

      const seriesRows = [];
      for (const ex of exerciciosRealizados) {
        const exercicio = await trx("Exercicios")
          .where({ nome: ex.nome })
          .first("id");

        if (!exercicio) continue;

        if (Array.isArray(ex.seriesExecutadas) && ex.seriesExecutadas.length > 0) {
          ex.seriesExecutadas.forEach((serie, idx) => {
            seriesRows.push({
              historicoTreinoId,
              exercicioId: exercicio.id,
              numeroSerie: toInt(serie.numeroSerie, idx + 1),
              carga: toDecimalOrNull(serie.carga),
              repeticoesFeitas: toInt(serie.repeticoesFeitas, parseRepeticoes(ex.repeticoes, 0)),
              concluida: Boolean(serie.concluida ?? true),
              observacao: serie.observacao ?? null
            });
          });
          continue;
        }

        const seriesTotal = toInt(ex.series, 1);
        for (let numeroSerie = 1; numeroSerie <= seriesTotal; numeroSerie += 1) {
          seriesRows.push({
            historicoTreinoId,
            exercicioId: exercicio.id,
            numeroSerie,
            carga: toDecimalOrNull(ex.carga),
            repeticoesFeitas: parseRepeticoes(ex.repeticoes, 0),
            concluida: true,
            observacao: null
          });
        }
      }

      if (seriesRows.length > 0) {
        await trx("HistoricoSeries").insert(seriesRows);
      }

      res.status(201).json({
        message: "Treino e histórico salvos com sucesso!",
        treinoId,
        historicoTreinoId
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
        "te.repeticoes",
        "te.descansoSegundos",
        "te.cargaSugerida",
        "te.ordem"
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
        repeticoes: curr.repeticoes,
        descansoSegundos: curr.descansoSegundos,
        cargaSugerida: curr.cargaSugerida,
        ordem: curr.ordem
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
    const { treinoId, duracaoSegundos } = req.body;
    const usuarioId = req.usuario.id;

    if (!treinoId) {
      return res.status(400).json({ message: "ID do treino é obrigatório" });
    }

    await db("HistoricoTreinos").insert({
      usuarioId,
      treinoId,
      dataTreino: db.fn.now(),
      duracaoSegundos: toInt(duracaoSegundos, 0) || null
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

    const historicoRows = await db("HistoricoTreinos as h")
      .join("Treinos as t", "h.treinoId", "t.id")
      .leftJoin("HistoricoSeries as hs", "hs.historicoTreinoId", "h.id")
      .leftJoin("Exercicios as e", "e.id", "hs.exercicioId")
      .where("h.usuarioId", usuarioId)
      .select(
        "h.id",
        "h.dataTreino",
        "h.duracaoSegundos",
        "t.nome as NomeTreino",
        "t.descricao as ExerciciosRealizados",
        "hs.id as SerieId",
        "hs.numeroSerie",
        "hs.carga",
        "hs.repeticoesFeitas",
        "hs.concluida",
        "hs.observacao",
        "e.id as ExercicioId",
        "e.nome as ExercicioNome"
      )
      .orderBy("h.dataTreino", "desc");

    const historico = historicoRows.reduce((acc, row) => {
      let treino = acc.find((item) => item.id === row.id);
      if (!treino) {
        treino = {
          id: row.id,
          dataTreino: row.dataTreino,
          duracaoSegundos: row.duracaoSegundos,
          NomeTreino: row.NomeTreino,
          ExerciciosRealizados: row.ExerciciosRealizados,
          series: []
        };
        acc.push(treino);
      }

      if (row.SerieId) {
        treino.series.push({
          id: row.SerieId,
          exercicioId: row.ExercicioId,
          exercicioNome: row.ExercicioNome,
          numeroSerie: row.numeroSerie,
          carga: row.carga,
          repeticoesFeitas: row.repeticoesFeitas,
          concluida: row.concluida,
          observacao: row.observacao
        });
      }

      return acc;
    }, []);

    res.json(historico);

  } catch (error) {
    console.error("❌ ERRO AO LISTAR HISTÓRICO:", error);
    res.status(500).json({ message: "Erro ao listar histórico" });
  }
}

// RESUMO DO DASHBOARD
export async function resumoDashboard(req, res) {
  try {
    const usuarioId = req.usuario.id;

    const historicoRows = await db("HistoricoTreinos as h")
      .join("Treinos as t", "h.treinoId", "t.id")
      .leftJoin("HistoricoSeries as hs", "hs.historicoTreinoId", "h.id")
      .leftJoin("Exercicios as e", "e.id", "hs.exercicioId")
      .where("h.usuarioId", usuarioId)
      .select(
        "h.id as historicoId",
        "h.dataTreino",
        "h.duracaoSegundos",
        "t.nome as treinoNome",
        "hs.id as serieId",
        "hs.carga",
        "hs.repeticoesFeitas",
        "hs.concluida",
        "e.nome as exercicioNome"
      )
      .orderBy("h.dataTreino", "desc");

    const grouped = historicoRows.reduce((acc, row) => {
      const key = row.historicoId;
      if (!acc[key]) {
        acc[key] = {
          id: row.historicoId,
          treinoNome: row.treinoNome,
          dataTreino: row.dataTreino,
          duracaoSegundos: row.duracaoSegundos ?? 0,
          series: []
        };
      }

      if (row.serieId) {
        acc[key].series.push({
          id: row.serieId,
          exercicioNome: row.exercicioNome,
          carga: Number(row.carga) || 0,
          repeticoesFeitas: row.repeticoesFeitas || 0,
          concluida: Boolean(row.concluida)
        });
      }

      return acc;
    }, {});

    const historicoList = Object.values(grouped);
    const totalTreinos = historicoList.length;
    const totalDuracaoSegundos = historicoList.reduce(
      (sum, item) => sum + (item.duracaoSegundos || 0),
      0
    );
    const totalVolumeKg = historicoList.reduce(
      (sum, item) =>
        sum +
        item.series.reduce(
          (seriesSum, serie) =>
            seriesSum + (serie.concluida ? (Number(serie.carga) || 0) : 0),
          0
        ),
      0
    );

    const last7Days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const label = d
        .toLocaleDateString("pt-BR", { weekday: "short" })
        .replace(".", "")
        .toUpperCase()
        .slice(0, 1);

      const count = historicoList.filter((item) => {
        const itemDate = new Date(item.dataTreino);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.toISOString().slice(0, 10) === dateKey;
      }).length;

      last7Days.push({ date: dateKey, label, treinos: count });
    }

    const ultimoTreino = historicoList[0] || null;
    const ultimoTreinoExercicios = ultimoTreino
      ? Object.values(
          ultimoTreino.series.reduce((acc, serie) => {
            const key = serie.exercicioNome || "Exercício";
            if (!acc[key]) {
              acc[key] = { nome: key, series: 0, volumeKg: 0 };
            }
            if (serie.concluida) {
              acc[key].series += 1;
              acc[key].volumeKg += Number(serie.carga) || 0;
            }
            return acc;
          }, {})
        )
      : [];

    let maiorCarga = { exercicioNome: "--", carga: 0 };
    historicoList.forEach((treino) => {
      treino.series.forEach((serie) => {
        if ((Number(serie.carga) || 0) > maiorCarga.carga) {
          maiorCarga = {
            exercicioNome: serie.exercicioNome || "--",
            carga: Number(serie.carga) || 0
          };
        }
      });
    });

    res.json({
      resumo: {
        totalTreinos,
        totalVolumeKg,
        totalDuracaoSegundos
      },
      ultimoTreino: ultimoTreino
        ? {
            id: ultimoTreino.id,
            nome: ultimoTreino.treinoNome,
            dataTreino: ultimoTreino.dataTreino,
            duracaoSegundos: ultimoTreino.duracaoSegundos || 0,
            exercicios: ultimoTreinoExercicios
          }
        : null,
      semana: last7Days,
      destaques: {
        recordeExercicio: maiorCarga.exercicioNome,
        recordeCargaKg: maiorCarga.carga
      }
    });
  } catch (error) {
    console.error("❌ ERRO AO BUSCAR RESUMO DASHBOARD:", error);
    res.status(500).json({ message: "Erro ao buscar resumo do dashboard" });
  }
}
