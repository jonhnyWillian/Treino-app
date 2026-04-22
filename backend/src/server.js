import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { db } from "./config/knex.js";
import { DatabaseInitializer } from "./database/DatabaseInitializerPostgreSQL.js";

import userRoutes from "./routes/userRoutes.js";
import workoutRoutes from "./routes/workoutRoutes.js";

// Carrega as variáveis do arquivo .env para process.env antes de qualquer outro uso.
// Deve ser chamado o mais cedo possível para garantir que JWT_SECRET, DATABASE_URL
// e demais variáveis estejam disponíveis quando os módulos importados forem executados.
dotenv.config();

const app = express();

// Habilita CORS para todas as origens, permitindo que o frontend (em outro domínio/porta)
// consuma a API sem ser bloqueado pelo navegador.
// Em produção, considere restringir as origens permitidas via opções do cors().
app.use(cors());

// Habilita o parsing automático de JSON no body das requisições.
// Sem isso, req.body seria undefined em rotas POST/PATCH/PUT.
app.use(express.json());

/**
 * Inicializa a conexão com o banco, cria as tabelas (em DEV) e sobe o servidor HTTP.
 *
 * Encapsulado em função async para permitir o uso de await no nível de módulo,
 * já que o top-level await não é suportado em todos os ambientes Node.js.
 *
 * Fluxo:
 * 1. Testa a conexão com o PostgreSQL com uma query mínima (`select 1`).
 * 2. Em ambiente de desenvolvimento, executa o inicializador de tabelas (migrations leves).
 * 3. Registra as rotas da aplicação.
 * 4. Inicia o servidor HTTP na porta definida pelo ambiente ou 3001 como fallback.
 *
 * Em caso de qualquer falha durante a inicialização, loga o erro e encerra o processo
 * com código 1 para que o orquestrador (Docker, PM2, Render) possa reiniciar o serviço.
 */
async function startServer() {
  try {
    // Verifica a conectividade com o banco antes de registrar rotas ou subir o servidor.
    // Uma query `select 1` é a forma mais leve de confirmar que a conexão está ativa.
    // Falhar aqui indica problema de credenciais, rede ou indisponibilidade do Neon.
    await db.raw("select 1");
    console.log("✅ Conectado ao PostgreSQL (Neon)");

    // Cria ou verifica as tabelas apenas em desenvolvimento.
    // Em produção as tabelas já devem existir (via migrations formais),
    // evitando alterações estruturais automáticas no banco de produção.
    if (process.env.NODE_ENV !== "production") {
      await DatabaseInitializer.init();
      console.log("🧱 Tabelas verificadas/criadas");
    }

    // Registra os grupos de rotas da aplicação com seus prefixos de URL.
    // Todas as rotas de usuário ficam sob /users e as de treino sob /workouts.
    app.use("/users", userRoutes);
    app.use("/workouts", workoutRoutes);

    // Rota de health check: confirma que o servidor está no ar sem autenticação.
    // Útil para monitoramento externo (UptimeRobot, Render health checks etc.).
    app.get("/", (req, res) => {
      res.send("API rodando 🚀");
    });

    // Usa a variável PORT injetada pelo ambiente de hospedagem (Render, Railway etc.).
    // O fallback 3001 é usado apenas em desenvolvimento local para não conflitar com
    // outros serviços que comumente ocupam a porta 3000.
    const PORT = process.env.PORT || 3001;

    // "0.0.0.0" faz o servidor escutar em todas as interfaces de rede,
    // necessário em containers e plataformas de cloud que roteiam tráfego externamente.
    // Usar "localhost" ou "127.0.0.1" bloquearia conexões externas nesses ambientes.
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });

  } catch (error) {
    // Qualquer falha na inicialização (conexão, criação de tabelas etc.) é fatal.
    // process.exit(1) sinaliza saída com erro para que o processo seja reiniciado
    // automaticamente por orquestradores como PM2, Docker ou o próprio Render.
    console.error("❌ Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}

startServer();