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
  googleLogin
} from "../controllers/userController.js";

import { verificarToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

//  rotas públicas
router.post("/cadastro", cadastrarUsuario);
router.post("/login", loginUsuario);
router.post("/google-login", googleLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

//  rota protegida
router.get("/perfil", verificarToken, getPerfil);
router.patch("/perfil", verificarToken, updatePerfil);
router.post("/desativar", verificarToken, desativarConta);
router.post("/redefinir-senha-logado", verificarToken, redefinirSenhaLogado);



export default router;