import { Router } from "express";

import { consultarParticipacoes } from "../../application/use-cases/consultarParticipacoes.js";
import { autenticar } from "../middleware/autenticar.js";
import type { Sessao } from "../jwt.js";

export const licitanteRoutes = Router();

licitanteRoutes.get(
  "/participacoes",
  autenticar("LICITANTE"),
  async (_req, res) => {
    try {
      const sessao = res.locals.sessao as Sessao;

      const participacoes = await consultarParticipacoes(
        sessao.usuarioId
      );

      res.status(200).json(participacoes);
    } catch (erro) {
      console.error("Erro ao consultar participações:", erro);

      res.status(500).json({
        erro: "Não foi possível consultar as participações.",
      });
    }
  }
);
