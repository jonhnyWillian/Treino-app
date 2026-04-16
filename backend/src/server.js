import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { db } from "./config/knex.js";
import { DatabaseInitializer } from "./database/DatabaseInitializerPostgreSQL.js";

import userRoutes from "./routes/userRoutes.js";
import workoutRoutes from "./routes/workoutRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

async function startServer() {
  try {
    // 🔌 Testa conexão com PostgreSQL (Neon)
    await db.raw("select 1");
    console.log("✅ Conectado ao PostgreSQL (Neon)");

    // 🧱 Inicializa tabelas (opcional em produção)
    //await DatabaseInitializer.init();
    
    // cria tabelas (DEV apenas)
    if (process.env.NODE_ENV !== "production") {
      await DatabaseInitializer.init();
      console.log("🧱 Tabelas verificadas/criadas");
    }


    // 🚀 Rotas
    app.use("/users", userRoutes);
    app.use("/workouts", workoutRoutes);

    app.get("/", (req, res) => {
      res.send("API rodando 🚀");
    });

    // ⚠️ IMPORTANTE: usar PORT do ambiente (Render/Railway/Neon)
    const PORT = process.env.PORT || 3001;

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}

startServer();