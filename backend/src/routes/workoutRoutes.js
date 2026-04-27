import express from "express";
import { 
  finalizarTreinoCompleto, 
  listarTreinos, 
  salvarHistorico, 
  listarHistorico,
  resumoDashboard,
  listarRecordesPessoais
} from "../controllers/workoutController.js";
import { verificarToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Todas as rotas de treino precisam de autenticação
router.use(verificarToken);

// Rotas para Definição de Treinos
router.post("/finalizar", finalizarTreinoCompleto);
router.get("/listar", listarTreinos);

// Rotas para Histórico de Treinos
router.post("/historico/salvar", salvarHistorico);
router.get("/historico/listar", listarHistorico);
router.get("/dashboard/resumo", resumoDashboard);
router.get("/recordes", listarRecordesPessoais);

export default router;
