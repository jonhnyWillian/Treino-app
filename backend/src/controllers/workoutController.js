import { db } from "../config/knex.js";

/**
 * Converte um valor qualquer para inteiro.
 * Usa parseInt com base 10 para evitar interpretações octal/hex.
 * Retorna o fallback se o valor não for um número válido (NaN).
 */
function toInt(value, fallback = 0) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Converte um valor para decimal (float) ou retorna null se inválido.
 * Aceita vírgula como separador decimal (padrão brasileiro) substituindo por ponto.
 * Retorna null para valores vazios, nulos ou não numéricos — evita salvar 0 no banco
 * quando o usuário não informou carga, preservando a semântica de "não informado".
 */
function toDecimalOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const normalized = String(value).replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Extrai o número de repetições de um valor que pode ser string, número ou range (ex: "10-12").
 * Quando recebe um range como "10-12", usa o valor mínimo (10) como referência.
 * Necessário porque o frontend pode enviar repetições como string formatada ou número direto.
 */
function parseRepeticoes(value, fallback = 0) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value !== "string") {
    return fallback;
  }
  const first = value.split("-")[0]?.trim();
  return toInt(first, fallback);
}

/**
 * Finaliza um treino salvando tudo em uma única transação:
 * treino → exercícios → vínculo usuário → histórico → séries executadas.
 *
 * Usa transação do banco (db.transaction) para garantir atomicidade —
 * se qualquer etapa falhar, todas as inserções são desfeitas (rollback automático).
 * Isso evita dados parcialmente salvos (ex: treino sem histórico ou histórico sem séries).
 *
 * Aceita dois formatos de séries:
 * - Com seriesExecutadas: usa os dados detalhados por série enviados pelo frontend
 * - Sem seriesExecutadas: gera as séries automaticamente com base no total de séries do exercício
 */
export async function finalizarTreinoCompleto(req, res) {
  try {
    const { tipo, diaSemana, exerciciosRealizados, duracaoSegundos } = req.body;
    const usuarioId = Number(req.usuario.id);

    // Validação dos campos obrigatórios antes de iniciar a transação
    if (!tipo || !Array.isArray(exerciciosRealizados) || exerciciosRealizados.length === 0 || !diaSemana) {
      return res.status(400).json({ message: "Dados incompletos" });
    }

    let treinoId;
    let historicoTreinoId;

    await db.transaction(async (trx) => {

      // Formata o nome do treino com base no tipo (ex: "inferior" → "Treino Inferior")
      const nomesExercicios = exerciciosRealizados.map(ex => ex.nome).join(", ");
      const tipoFormatado = tipo.charAt(0).toUpperCase() + tipo.slice(1);
      const nomeTreino = `Treino ${tipoFormatado}`;

      // ETAPA 1: Cria o registro do treino com nome e lista de exercícios na descrição
      const [treino] = await trx("Treinos")
        .insert({
          nome: nomeTreino,
          descricao: nomesExercicios
        })
        .returning(["id"]);

      treinoId = treino.id;

      // ETAPA 2: Insere cada exercício realizado no treino
      for (let index = 0; index < exerciciosRealizados.length; index += 1) {
        const ex = exerciciosRealizados[index];

        // Verifica se o exercício já existe no banco pelo nome para evitar duplicatas
        let exercicio = await trx("Exercicios")
          .where({ nome: ex.nome })
          .first();

        // Cria o exercício se ainda não existir (cadastro automático no primeiro uso)
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

        // Vincula o exercício ao treino com suas configurações (séries, repetições, carga, ordem)
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

      // ETAPA 3: Cria o vínculo entre o usuário e o treino com o dia da semana
      await trx("UsuarioTreinos").insert({
        usuarioId,
        treinoId,
        diaSemana: String(diaSemana)
      });

      // ETAPA 4: Registra o histórico do treino com data e duração
      const [historico] = await trx("HistoricoTreinos")
        .insert({
          usuarioId,
          treinoId,
          dataTreino: new Date(),
          duracaoSegundos: toInt(duracaoSegundos, 0) || null
        })
        .returning(["id"]);

      historicoTreinoId = historico.id;

      // ETAPA 5: Monta e insere as séries executadas no histórico
      const seriesRows = [];

      for (const ex of exerciciosRealizados) {
        // Busca o exercício pelo nome para obter o ID necessário no histórico
        const exercicio = await trx("Exercicios")
          .where({ nome: ex.nome })
          .first("id");

        if (!exercicio) continue;

        if (Array.isArray(ex.seriesExecutadas) && ex.seriesExecutadas.length > 0) {
          // Usa as séries detalhadas enviadas pelo frontend (com carga e repetições por série)
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

        // Fallback: gera séries automaticamente com valores uniformes quando não há detalhamento
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

      // Insere todas as séries de uma vez para melhor performance (batch insert)
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

/**
 * Lista todos os treinos do usuário autenticado com seus exercícios.
 * Faz JOIN entre UsuarioTreinos → Treinos → TreinoExercicios → Exercicios.
 * Agrupa as linhas retornadas pelo banco em objetos de treino com array de exercícios,
 * pois o JOIN retorna uma linha por exercício (desnormalizado) e precisamos agrupar.
 */
export async function listarTreinos(req, res) {
  try {
    const usuarioId = req.usuario.id;

    // Busca todas as linhas do JOIN — cada linha representa um exercício de um treino
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

    // Agrupa as linhas por treino — transforma resultado plano em estrutura aninhada
    const treinos = rows.reduce((acc, curr) => {
      let treino = acc.find(t => t.id === curr.TreinoId);

      // Cria o treino no acumulador se ainda não existir
      if (!treino) {
        treino = {
          id: curr.TreinoId,
          nome: curr.TreinoNome,
          diaSemana: curr.diaSemana,
          exercicios: []
        };
        acc.push(treino);
      }

      // Adiciona o exercício atual ao treino correspondente
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

/**
 * Salva um registro de histórico para um treino já existente.
 * Usado para registrar manualmente que o usuário realizou um treino,
 * sem os detalhes das séries (diferente de finalizarTreinoCompleto).
 * O treinoId é obrigatório — o treino deve existir previamente no banco.
 */
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

/**
 * Lista o histórico completo de treinos do usuário com todas as séries executadas.
 * Faz JOIN com HistoricoSeries e Exercicios para retornar os detalhes de cada série.
 * Usa leftJoin para incluir treinos sem séries registradas.
 * Agrupa o resultado por sessão de treino (historicoId), ordenado do mais recente ao mais antigo.
 */
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

    // Agrupa linhas por sessão de treino e aninha as séries em cada sessão
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

      // Adiciona a série apenas se existir (leftJoin pode retornar null para séries)
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

/**
 * Gera o resumo do dashboard com estatísticas agregadas do usuário.
 *
 * Calcula e retorna:
 * - resumo: total de treinos, volume total (kg) e duração total (segundos)
 * - ultimoTreino: dados do treino mais recente com exercícios agrupados
 * - semana: frequência de treinos nos últimos 7 dias para o gráfico semanal
 * - destaques: exercício e carga recordes (maior carga registrada em qualquer série)
 *
 * Toda a agregação é feita em memória (JS) após uma única query ao banco,
 * evitando múltiplas queries e reduzindo latência.
 */
export async function resumoDashboard(req, res) {
  try {
    const usuarioId = req.usuario.id;

    // Busca todo o histórico do usuário com séries e exercícios em uma única query
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

    // Agrupa as linhas por sessão de treino usando o historicoId como chave
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

    // Calcula totais: número de treinos, volume total e duração total
    const totalTreinos = historicoList.length;
    const totalDuracaoSegundos = historicoList.reduce(
      (sum, item) => sum + (item.duracaoSegundos || 0),
      0
    );

    // Volume total: soma das cargas apenas das séries concluídas
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

    // Gera o array dos últimos 7 dias com contagem de treinos por dia
    // Usado para renderizar o gráfico de frequência semanal no dashboard
    const last7Days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);

      // Pega só a primeira letra do dia da semana em português (ex: "S", "T", "Q")
      const label = d
        .toLocaleDateString("pt-BR", { weekday: "short" })
        .replace(".", "")
        .toUpperCase()
        .slice(0, 1);

      // Conta treinos realizados neste dia específico
      const count = historicoList.filter((item) => {
        const itemDate = new Date(item.dataTreino);
        itemDate.setHours(0, 0, 0, 0);
        return itemDate.toISOString().slice(0, 10) === dateKey;
      }).length;

      last7Days.push({ date: dateKey, label, treinos: count });
    }

    // Último treino: o mais recente (primeiro do array já ordenado por data desc)
    const ultimoTreino = historicoList[0] || null;

    // Agrupa os exercícios do último treino somando séries e volume por exercício
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

    // Encontra o recorde de carga: maior valor registrado em qualquer série de qualquer treino
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