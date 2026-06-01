import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import { db } from "./config/knex.js";
import { DatabaseInitializer } from "./database/DatabaseInitializerPostgreSQL.js";

import userRoutes from "./routes/userRoutes.js";
import workoutRoutes from "./routes/workoutRoutes.js";

dotenv.config();

const app = express();

const allowedOrigins = process.env.NODE_ENV === "production"
  ? [process.env.APP_URL]
  : ["http://localhost:3000"];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

async function startServer() {
  try {
    await db.raw("select 1");
    console.log("✅ Conectado ao PostgreSQL (Neon)");

    if (process.env.NODE_ENV !== "production") {
      await DatabaseInitializer.init();
      console.log("🧱 Tabelas verificadas/criadas");
    }

    app.use("/", userRoutes);
    app.use("/workouts", workoutRoutes);

    app.get("/", (req, res) => {
      res.send("API rodando 🚀");
    });

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