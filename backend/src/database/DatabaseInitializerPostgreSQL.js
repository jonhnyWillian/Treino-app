// /src/database/DatabaseInitializer.js

import { db } from "../config/knex.js";

export class DatabaseInitializer {
  static async init() {
    try {
      console.log("🔄 Inicializando banco com Knex...");

      await this.createUsuarios();
      await this.createTreinos();
      await this.createExercicios();
      await this.createTreinoExercicios();
      await this.createUsuarioTreinos();
      await this.createHistoricoTreinos();
      await this.createHistoricoSeries(); // deve vir após HistoricoTreinos

      console.log("✅ Banco pronto com Knex!");
    } catch (error) {
      console.error("❌ Erro ao inicializar banco:", error);
      throw error;
    }
  }

  // tabela de Usuarios
  static async createUsuarios() {
    const exists = await db.schema.hasTable("Usuarios");

    if (!exists) {
      await db.schema.createTable("Usuarios", (table) => {
        table.increments("id").primary(); // SERIAL no Postgres
        table.string("nome", 100).notNullable();
        table.string("email", 150).notNullable().unique();
        table.string("senha", 200).notNullable();
        table.integer("idade");
        table.string("sexo", 20);
        table.string("telefone", 20);
        table.text("fotoPerfil").nullable();
        table.decimal("altura", 5, 2);
        table.decimal("peso", 5, 2);

        table.string("resetToken");
        table.timestamp("resetTokenExp"); // 🔥 melhor que dateTime no Postgres

        table.string("situacao", 20).defaultTo("ativo").notNullable();
        table.timestamp("dataCriacao").defaultTo(db.fn.now()).notNullable();
      });
      return;
    }

    const hasFotoPerfil = await db.schema.hasColumn("Usuarios", "fotoPerfil");
    if (!hasFotoPerfil) {
      await db.schema.alterTable("Usuarios", (table) => {
        table.text("fotoPerfil").nullable();
      });
    }
  }

  // tabela de Treinos  
  static async createTreinos() {
    const exists = await db.schema.hasTable("Treinos");

    if (!exists) {
      await db.schema.createTable("Treinos", (table) => {
        table.increments("id").primary();
        table.string("nome", 100).notNullable();
        table.text("descricao");
      });
    }
  }

  // tabela de Exercicios
  // imagemUrl e videoUrl são opcionais — videoUrl preenchido posteriormente
  static async createExercicios() {
    const exists = await db.schema.hasTable("Exercicios");

    if (!exists) {
      await db.schema.createTable("Exercicios", (table) => {
        table.increments("id").primary();
        table.string("nome", 150).notNullable();
        table.string("grupoMuscular", 100);
        table.specificType("musculosSecundarios", "text[]").nullable(); // ex: ["tríceps", "ombro"]
        table.string("equipamento", 100).nullable();                    // ex: "barra livre", "halteres"
        table.string("categoria", 100).nullable();                      // ex: "empurrada horizontal"
        table.text("descricao");
        table.specificType("instrucoes", "text[]").nullable();          // passos de execução em ordem
        table.string("imagemUrl", 300).nullable();                      // SVG ou GIF ilustrativo
        table.string("videoUrl", 300).nullable();                       // demonstração em vídeo (futuro)
      });
      return;
    }

    const hasGrupoMuscular = await db.schema.hasColumn("Exercicios", "grupoMuscular");
    const hasMusculosSecundarios = await db.schema.hasColumn("Exercicios", "musculosSecundarios");
    const hasEquipamento = await db.schema.hasColumn("Exercicios", "equipamento");
    const hasCategoria = await db.schema.hasColumn("Exercicios", "categoria");
    const hasInstrucoes = await db.schema.hasColumn("Exercicios", "instrucoes");
    const hasImagemUrl = await db.schema.hasColumn("Exercicios", "imagemUrl");
    const hasVideoUrl = await db.schema.hasColumn("Exercicios", "videoUrl");

    if (
      !hasGrupoMuscular ||
      !hasMusculosSecundarios ||
      !hasEquipamento ||
      !hasCategoria ||
      !hasInstrucoes ||
      !hasImagemUrl ||
      !hasVideoUrl
    ) {
      await db.schema.alterTable("Exercicios", (table) => {
        if (!hasGrupoMuscular) table.string("grupoMuscular", 100);
        if (!hasMusculosSecundarios) table.specificType("musculosSecundarios", "text[]").nullable();
        if (!hasEquipamento) table.string("equipamento", 100).nullable();
        if (!hasCategoria) table.string("categoria", 100).nullable();
        if (!hasInstrucoes) table.specificType("instrucoes", "text[]").nullable();
        if (!hasImagemUrl) table.string("imagemUrl", 300).nullable();
        if (!hasVideoUrl) table.string("videoUrl", 300).nullable();
      });
    }
  }

  // tabela de TreinoExercicios
  // armazena os valores PLANEJADOS do treino (template), não o executado
  static async createTreinoExercicios() {
    const exists = await db.schema.hasTable("TreinoExercicios");

    if (!exists) {
      await db.schema.createTable("TreinoExercicios", (table) => {
        table.increments("id").primary();

        table
          .integer("treinoId")
          .unsigned()
          .notNullable()
          .references("id")
          .inTable("Treinos")
          .onDelete("CASCADE"); // importante

        table
          .integer("exercicioId")
          .unsigned()
          .notNullable()
          .references("id")
          .inTable("Exercicios")
          .onDelete("CASCADE");

        table.integer("series");
        table.integer("repeticoes");
        table.integer("descansoSegundos");
        table.decimal("cargaSugerida", 5, 2).nullable(); // referência de carga para o aluno
        table.integer("ordem").defaultTo(0);             // ordem de exibição no treino
      });
      return;
    }

    const hasDescansoSegundos = await db.schema.hasColumn("TreinoExercicios", "descansoSegundos");
    const hasCargaSugerida = await db.schema.hasColumn("TreinoExercicios", "cargaSugerida");
    const hasOrdem = await db.schema.hasColumn("TreinoExercicios", "ordem");

    if (!hasDescansoSegundos || !hasCargaSugerida || !hasOrdem) {
      await db.schema.alterTable("TreinoExercicios", (table) => {
        if (!hasDescansoSegundos) table.integer("descansoSegundos");
        if (!hasCargaSugerida) table.decimal("cargaSugerida", 5, 2).nullable();
        if (!hasOrdem) table.integer("ordem").defaultTo(0);
      });
    }
  }

  // tabela de UsuarioTreinos
  static async createUsuarioTreinos() {
    const exists = await db.schema.hasTable("UsuarioTreinos");

    if (!exists) {
      await db.schema.createTable("UsuarioTreinos", (table) => {
        table.increments("id").primary();

        table
          .integer("usuarioId")
          .unsigned()
          .notNullable()
          .references("id")
          .inTable("Usuarios")
          .onDelete("CASCADE");

        table
          .integer("treinoId")
          .unsigned()
          .notNullable()
          .references("id")
          .inTable("Treinos")
          .onDelete("CASCADE");

        table.string("diaSemana", 20);
      });
    }
  }

  //  tabela de HistoricoTreinos
  // 1 registro por sessão de treino realizada pelo usuário
  static async createHistoricoTreinos() {
    const exists = await db.schema.hasTable("HistoricoTreinos");

    if (!exists) {
      await db.schema.createTable("HistoricoTreinos", (table) => {
        table.increments("id").primary();

        table
          .integer("usuarioId")
          .unsigned()
          .notNullable()
          .references("id")
          .inTable("Usuarios")
          .onDelete("CASCADE");

        table
          .integer("treinoId")
          .unsigned()
          .notNullable()
          .references("id")
          .inTable("Treinos")
          .onDelete("CASCADE");

        table.timestamp("dataTreino").defaultTo(db.fn.now()).notNullable();
        table.integer("duracaoSegundos").nullable(); // tempo total capturado pelo cronômetro
      });
      return;
    }

    const hasDuracaoSegundos = await db.schema.hasColumn("HistoricoTreinos", "duracaoSegundos");
    if (!hasDuracaoSegundos) {
      await db.schema.alterTable("HistoricoTreinos", (table) => {
        table.integer("duracaoSegundos").nullable();
      });
    }
  }
  // tabela de HistoricoSeries
  // N registros por sessão — 1 linha para cada série executada em cada exercício
  // estrutura: HistoricoTreinos (1) → HistoricoSeries (N)
  // permite calcular PRs com MAX(carga) agrupado por exercicioId + usuarioId
  static async createHistoricoSeries() {
    const exists = await db.schema.hasTable("HistoricoSeries");

    if (!exists) {
      await db.schema.createTable("HistoricoSeries", (table) => {
        table.increments("id").primary();

        table
          .integer("historicoTreinoId")
          .unsigned()
          .notNullable()
          .references("id")
          .inTable("HistoricoTreinos")
          .onDelete("CASCADE");

        table
          .integer("exercicioId")
          .unsigned()
          .notNullable()
          .references("id")
          .inTable("Exercicios")
          .onDelete("CASCADE");

        table.integer("numeroSerie").notNullable();       // 1, 2, 3...
        table.decimal("carga", 5, 2).nullable();          // peso utilizado em kg
        table.integer("repeticoesFeitas").notNullable();  // reps realizadas na série
        table.boolean("concluida").defaultTo(false);      // série marcada como ✓ concluída
        table.text("observacao").nullable();              // ex: "travou na última rep"
        table.timestamp("criadoEm").defaultTo(db.fn.now());
      });
    }
  }

}