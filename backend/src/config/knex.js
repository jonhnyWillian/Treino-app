import knex from "knex";
import dotenv from "dotenv";

dotenv.config();

/*
========================================
❌ CONFIG ANTIGA - SQL SERVER (MSSQL)
========================================

export const db = knex({
  client: "mssql",
  connection: {
    server: "localhost",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      instanceName: "SQLEXPRESS"
    }
  },
  pool: {
    min: 0,
    max: 10
  }
});
*/

/*
========================================
✅ NOVA CONFIG - POSTGRESQL (NEON / RENDER)
========================================
*/

export const db = knex({
  client: "pg",
  connection: process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false, // 🔥 necessário pro Neon
        },
      }
    : {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
      },
  pool: {
    min: 0,
    max: 10,
  },
});