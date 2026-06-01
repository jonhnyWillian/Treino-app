import express from "express";

import {
  cadastrarUsuario,
  loginUsuario,
  forgotPassword,
  resetPassword,
  getPerfil,
  updatePerfil,
  desativarConta,
  redefinirSenhaLogado,
  googleLogin,
  listarUsuarios,
  logout,
  cadastrarClienteAdmin,
  editarUsuario
} from "../controllers/userController.js";
import { listarAlertas } from "../controllers/alertaController.js";
import { verificarToken, verificarAdmin } from "../middlewares/authMiddleware.js";
import { listarMensalidades, criarMensalidade, editarMensalidade } from "../controllers/mensalidadeController.js";
const router = express.Router();

// ── Rotas públicas ──────────────────────────────────────────
router.post("/cadastro",        cadastrarUsuario);
router.post("/login",           loginUsuario);
router.post("/google-login",    googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password",  resetPassword);
router.post("/logout",          logout);

// ── Rotas protegidas (cliente logado) ─────────────────────────
router.get("/perfil",                   verificarToken, getPerfil);
router.patch("/perfil",                 verificarToken, updatePerfil);
router.post("/desativar",               verificarToken, desativarConta);
router.post("/redefinir-senha-logado",  verificarToken, redefinirSenhaLogado);

// ── Rotas administrativas ────────────────────────────────────
router.get("/admin/users",         verificarToken, verificarAdmin, listarUsuarios);
router.post("/cadastro-cliente",   verificarToken, verificarAdmin, cadastrarClienteAdmin);
router.patch("/users/:id",         verificarToken, verificarAdmin, editarUsuario);
router.get("/admin/mensalidades",      verificarToken, verificarAdmin, listarMensalidades);
router.post("/admin/mensalidades",     verificarToken, verificarAdmin, criarMensalidade);
router.patch("/admin/mensalidades/:id", verificarToken, verificarAdmin, editarMensalidade);
router.get("/admin/alertas", verificarToken, verificarAdmin, listarAlertas);

export default router;