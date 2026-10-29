import { Router } from "express";

import { autenticarUsuario } from "../../application/use-cases/autenticarUsuario.js";
import { gerarToken } from "../jwt.js";
import { rateLimit } from "express-rate-limit";

export const authRoutes = Router();

const limitarLogin = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    erro: "Muitas tentativas de login. Tente novamente mais tarde.",
  },
});

authRoutes.post("/login", limitarLogin, async (req, res) => {
  try {
    const { email, senha } = req.body ?? {};

    if (typeof email !== "string" || typeof senha !== "string") {
      res.status(400).json({
        erro: "Informe e-mail e senha.",
      });
      return;
    }

    const usuario = await autenticarUsuario({
      email,
      senha,
    });

    const token = gerarToken({
      usuarioId: usuario.id,
      papel: usuario.papel,
    });

    res.status(200).json({
      token,
      usuario,
    });
  } catch (erro) {
    if (erro instanceof Error && ["O e-mail informado é inválido.", "A senha é obrigatória."].includes(erro.message)) {
      res.status(400).json({ erro: "Informe e-mail e senha válidos." });
      return;
    }

    if (erro instanceof Error && erro.message === "Credenciais inválidas.") {
      res.status(401).json({
        erro: "Credenciais inválidas.",
      });
      return;
    }

    console.error("Erro na autenticação:", erro);

    res.status(500).json({
      erro: "Erro interno do servidor.",
    });
  }
});
