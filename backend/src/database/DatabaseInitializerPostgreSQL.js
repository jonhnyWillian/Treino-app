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
        table.decimal("altura", 5, 2);
        table.decimal("peso", 5, 2);

        table.string("resetToken");
        table.timestamp("resetTokenExp"); // 🔥 melhor que dateTime no Postgres

        table.string("situacao", 20).defaultTo("ativo").notNullable();
        table.timestamp("dataCriacao").defaultTo(db.fn.now()).notNullable();
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
  static async createExercicios() {
    const exists = await db.schema.hasTable("Exercicios");

    if (!exists) {
      await db.schema.createTable("Exercicios", (table) => {
        table.increments("id").primary();
        table.string("nome", 150).notNullable();
        table.string("grupoMuscular", 100);
        table.text("descricao");
      });
    }
  }

  // tabela de TreinoExercicios
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
          .onDelete("CASCADE"); // 🔥 importante

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
      });
    }
  }
}