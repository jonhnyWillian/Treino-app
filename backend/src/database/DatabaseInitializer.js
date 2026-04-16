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
        table.increments("id").primary();
        table.string("nome", 100).notNullable();
        table.string("email", 150).notNullable().unique();
        table.string("senha", 200).notNullable();
        table.integer("idade").nullable();
        table.string("sexo", 20).nullable();
        table.string("telefone", 20).nullable();
        table.decimal("altura", 5, 2).nullable();
        table.decimal("peso", 5, 2).nullable();
        table.string("resetToken", 255).nullable();
        table.dateTime("resetTokenExp").nullable();
        table.string("situacao", 20).defaultTo("ativo").notNullable();
        table.dateTime("dataCriacao").defaultTo(db.fn.now()).notNullable();
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
        table.text("descricao").nullable();
      });
    }
  }

  // tabela de  Exercicios
  static async createExercicios() {
    const exists = await db.schema.hasTable("Exercicios");

    if (!exists) {
      await db.schema.createTable("Exercicios", (table) => {
        table.increments("id").primary();
        table.string("nome", 150).notNullable();
        table.string("grupoMuscular", 100).nullable();
        table.text("descricao").nullable();
      });
    }
  }


  // tabela de TreinoExercicios
  static async createTreinoExercicios() {
    const exists = await db.schema.hasTable("TreinoExercicios");

    if (!exists) {
      await db.schema.createTable("TreinoExercicios", (table) => {
        table.increments("id").primary();
        table.integer("treinoId").notNullable();
        table.integer("exercicioId").notNullable();
        table.integer("series").nullable();
        table.integer("repeticoes").nullable();
        table.integer("descansoSegundos").nullable();

        table
          .foreign("treinoId")
          .references("id")
          .inTable("Treinos");

        table
          .foreign("exercicioId")
          .references("id")
          .inTable("Exercicios");
      });
    }
  }

  // tabela de UsuarioTreinos
  static async createUsuarioTreinos() {
    const exists = await db.schema.hasTable("UsuarioTreinos");

    if (!exists) {
      await db.schema.createTable("UsuarioTreinos", (table) => {
        table.increments("id").primary();
        table.integer("usuarioId").notNullable();
        table.integer("treinoId").notNullable();
        table.string("diaSemana", 20).nullable();

        table
          .foreign("usuarioId")
          .references("id")
          .inTable("Usuarios");

        table
          .foreign("treinoId")
          .references("id")
          .inTable("Treinos");
      });
    }
  }

  // tabela de  HistoricoTreinos
  static async createHistoricoTreinos() {
    const exists = await db.schema.hasTable("HistoricoTreinos");

    if (!exists) {
      await db.schema.createTable("HistoricoTreinos", (table) => {
        table.increments("id").primary();
        table.integer("usuarioId").notNullable();
        table.integer("treinoId").notNullable();
        table
          .dateTime("dataTreino")
          .defaultTo(db.fn.now())
          .notNullable();

        table
          .foreign("usuarioId")
          .references("id")
          .inTable("Usuarios");

        table
          .foreign("treinoId")
          .references("id")
          .inTable("Treinos");
      });
    }
  }
}