import { Router } from "express";

import { consultarLotesLeiloeiro } from "../../application/use-cases/consultarLotesLeiloeiro.js";
import { autenticar } from "../middleware/autenticar.js";
import type { Sessao } from "../jwt.js";

export const leiloeiroRoutes = Router();

leiloeiroRoutes.get(
  "/lotes",
  autenticar("LEILOEIRO"),
  async (_req, res) => {
    try {
      const sessao = res.locals.sessao as Sessao;

      const resultado = await consultarLotesLeiloeiro(
        sessao.usuarioId
      );

      res.status(200).json(resultado);
    } catch (erro) {
      console.error("Erro ao consultar lotes do leiloeiro:", erro);

      res.status(500).json({
        erro: "Não foi possível consultar os resultados.",
      });
    }
  }
);
