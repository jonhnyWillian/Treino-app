import knex from "knex";
import dotenv from "dotenv";
import { DatabaseInitializer } from "../database/DatabaseInitializer.js";

dotenv.config();

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


await DatabaseInitializer.init(); 