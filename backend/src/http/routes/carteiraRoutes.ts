import { Router } from "express";

import {
  consultarCarteira,
  depositarSaldo,
} from "../../application/use-cases/operacoesCarteira.js";
import { autenticar } from "../middleware/autenticar.js";
import type { Sessao } from "../jwt.js";

export const carteiraRoutes = Router();

carteiraRoutes.get("/", autenticar(), async (_req, res) => {
  try {
    const sessao = res.locals.sessao as Sessao;
    const carteira = await consultarCarteira(sessao.usuarioId);
    res.status(200).json(carteira);
  } catch (erro) {
    if (erro instanceof Error && erro.message === "Carteira não encontrada.") {
      res.status(404).json({ erro: erro.message });
      return;
    }

    console.error("Erro ao consultar carteira:", erro);
    res.status(500).json({ erro: "Não foi possível consultar a carteira." });
  }
});

carteiraRoutes.post("/depositos", autenticar("LICITANTE"), async (req, res) => {
  const valorMonetario: unknown = req.body?.valorMonetario;

  if (typeof valorMonetario !== "number" || !Number.isSafeInteger(valorMonetario) || valorMonetario <= 0) {
    res.status(400).json({ erro: "Informe um valor positivo em centavos." });
    return;
  }

  try {
    const sessao = res.locals.sessao as Sessao;
    const carteira = await depositarSaldo(sessao.usuarioId, valorMonetario);
    res.status(200).json(carteira);
  } catch (erro) {
    if (erro instanceof Error && erro.message === "Carteira não encontrada.") {
      res.status(404).json({ erro: erro.message });
      return;
    }

    console.error("Erro ao depositar saldo:", erro);
    res.status(500).json({ erro: "Não foi possível realizar o depósito." });
  }
});
