import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { db } from "./config/knex.js";
import { DatabaseInitializer } from "./database/DatabaseInitializer.js";

import userRoutes from "./routes/userRoutes.js";
import workoutRoutes from "./routes/workoutRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

async function startServer() {
  try {
    // 🔌 Testa conexão com banco
    await db.raw("SELECT 1");
    console.log("✅ Conectado ao SQL Server com Knex");

    // 🧱 Inicializa tabelas
    await DatabaseInitializer.init();

    // 🚀 Rotas
    app.use("/users", userRoutes);
    app.use("/workouts", workoutRoutes);

    app.get("/", (req, res) => {
      res.send("API rodando 🚀");
    });

    const PORT = 3001;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
    });

  } catch (error) {
    console.error("❌ Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}

startServer();