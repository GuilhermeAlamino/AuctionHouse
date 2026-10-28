import { Router } from "express";

import { consultarProdutos } from "../../application/use-cases/consultarProdutos.js";
import { autenticar } from "../middleware/autenticar.js";

export const produtoRoutes = Router();

produtoRoutes.get("/", autenticar("LEILOEIRO"), async (req, res) => {
  try {
    const busca =
      typeof req.query.q === "string"
        ? req.query.q.slice(0, 100)
        : "";

    const produtos = await consultarProdutos(busca);

    res.status(200).json(produtos);
  } catch (erro) {
    console.error("Erro ao consultar produtos:", erro);

    res.status(502).json({
      erro: "Não foi possível consultar o catálogo de produtos.",
    });
  }
});
