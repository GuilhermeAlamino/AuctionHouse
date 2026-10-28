import { Router } from "express";

import { criarLote } from "../../application/use-cases/criarLote.js";
import { verificarIntegridadeLances } from "../../application/use-cases/verificarIntegridadeLances.js";

import { autenticar } from "../middleware/autenticar.js";
import type { Sessao } from "../jwt.js";

import { realizarLance } from "../../application/use-cases/realizarLance.js";
import {
  consultarLote,
  consultarLotes,
} from "../../application/use-cases/consultarLotes.js";
import { cancelarLote } from "../../application/use-cases/cancelarLote.js";
import { consultarComprovante } from "../../application/use-cases/consultarComprovante.js";
import { consultarMinhaSituacao } from "../../application/use-cases/consultarMinhaSituacao.js";
import { assinarEventosLote, publicarEventoLote } from "../../infrastructure/eventos/eventosLote.js";

export const loteRoutes = Router();

const UUID_VALIDO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Vitrine pública.
loteRoutes.get("/", async (_req, res) => {
  try {
    const lotes = await consultarLotes();

    res.status(200).json(lotes);
  } catch (erro) {
    console.error("Erro ao consultar lotes:", erro);

    res.status(500).json({
      erro: "Não foi possível consultar os lotes.",
    });
  }
});

// SSE público: cada conexão escuta somente as alterações deste lote.
loteRoutes.get("/:loteId/eventos", async (req, res) => {
  const { loteId } = req.params;
  if (!UUID_VALIDO.test(loteId)) {
    res.status(400).json({ erro: "Identificador do lote inválido." });
    return;
  }

  try {
    await consultarLote(loteId);
  } catch (erro) {
    if (erro instanceof Error && erro.message === "Lote não encontrado.") {
      res.status(404).json({ erro: "Lote não encontrado." });
      return;
    }

    console.error("Erro ao abrir SSE:", erro);
    res.status(500).json({ erro: "Não foi possível acompanhar o lote." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // EventSource reconecta automaticamente em caso de queda.
  res.write("retry: 3000\n\n");

  const desinscrever = assinarEventosLote(loteId, (tipo) => {
    res.write(`event: atualizacao\ndata: ${JSON.stringify({ tipo })}\n\n`);
  });

  // Impede que proxies fechem uma conexão sem tráfego.
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 20_000);

  res.on("close", () => {
    clearInterval(heartbeat);
    desinscrever();
  });
});

// Detalhes públicos de um lote.
loteRoutes.get("/:loteId", async (req, res) => {
  try {
    const { loteId } = req.params;

    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuid.test(loteId)) {
      res.status(400).json({
        erro: "Identificador do lote inválido.",
      });
      return;
    }

    const lote = await consultarLote(loteId);

    res.status(200).json(lote);
  } catch (erro) {
    if (erro instanceof Error && erro.message === "Lote não encontrado.") {
      res.status(404).json({
        erro: "Lote não encontrado.",
      });
      return;
    }

    console.error("Erro ao consultar lote:", erro);

    res.status(500).json({
      erro: "Não foi possível consultar o lote.",
    });
  }
});

loteRoutes.post("/", autenticar("LEILOEIRO"), async (req, res) => {
  try {
    const dados = req.body ?? {};
    const sessao = res.locals.sessao as Sessao;

    if (
      typeof dados.produtoId !== "number" ||
      typeof dados.lanceInicial !== "number" ||
      typeof dados.incrementoMinimo !== "number" ||
      typeof dados.horarioInicio !== "string" ||
      typeof dados.horarioFim !== "string"
    ) {
      res.status(400).json({
        erro: "Dados obrigatórios inválidos.",
      });
      return;
    }

    const lote = await criarLote({
      leiloeiroId: sessao.usuarioId,
      produtoId: dados.produtoId,
      lanceInicial: dados.lanceInicial,
      incrementoMinimo: dados.incrementoMinimo,
      horarioInicio: new Date(dados.horarioInicio),
      horarioFim: new Date(dados.horarioFim),
    });

    res.status(201).json(lote);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "";

    if (mensagem === "Falha na consulta ao catálogo de produtos.") {
      res.status(502).json({ erro: mensagem });
      return;
    }

    const errosNegocio = [
      "Produto inválido.",
      "Produto não encontrado.",
      "Produto externo inválido.",
      "Datas inválidas.",
      "O período do lote é inválido.",
      "O horário de término deve ser futuro.",
      "O lance inicial deve ser maior que zero.",
      "O incremento mínimo deve ser maior que zero.",
      "Apenas leiloeiros podem criar lotes.",
    ];

    if (errosNegocio.includes(mensagem)) {
      res.status(422).json({ erro: mensagem });
      return;
    }

    console.error("Erro ao criar lote:", erro);

    res.status(500).json({
      erro: "Não foi possível criar o lote.",
    });
  }
});

// Mantemos a auditoria pública na rota de lotes.
loteRoutes.get("/:loteId/auditoria", async (req, res) => {
  if (!UUID_VALIDO.test(req.params.loteId)) {
    res.status(400).json({ erro: "Identificador do lote inválido." });
    return;
  }

  try {
    const resultado = await verificarIntegridadeLances(req.params.loteId);

    res.status(200).json(resultado);
  } catch (erro) {
    if (erro instanceof Error && erro.message === "Lote não encontrado.") {
      res.status(404).json({ erro: "Lote não encontrado." });
      return;
    }

    console.error("Erro na auditoria:", erro);

    res.status(500).json({
      erro: "Não foi possível consultar a auditoria.",
    });
  }
});

loteRoutes.post(
  "/:loteId/lances",
  autenticar("LICITANTE"),
  async (req, res) => {
    try {
      const { loteId } = req.params;

      if (!UUID_VALIDO.test(loteId)) {
        res.status(400).json({ erro: "Identificador do lote inválido." });
        return;
      }

      const { valorMonetario } = req.body ?? {};
      const sessao = res.locals.sessao as Sessao;

      if (!Number.isSafeInteger(valorMonetario) || valorMonetario <= 0) {
        res.status(400).json({
          erro: "Valor do lance inválido.",
        });
        return;
      }

      const lance = await realizarLance({
        loteId,
        licitanteId: sessao.usuarioId,
        valorMonetario,
      });

      // O caso de uso já confirmou a transação PostgreSQL.
      publicarEventoLote(loteId, "LANCE_REGISTRADO");

      res.status(201).json({
        id: lance.obterId(),
        loteId: lance.obterLoteId(),
        valorMonetario: lance.obterValorMonetario(),
        realizadoEm: lance.obterRealizadoEm(),
      });
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "";

      if (mensagem === "Lote não encontrado.") {
        res.status(404).json({ erro: mensagem });
        return;
      }

      const errosNegocio = [
        "O lote não está em andamento.",
        "O valor do lance é inválido.",
        "O lance está abaixo do valor mínimo permitido.",
        "Você já está liderando este lote.",
        "Saldo disponível insuficiente.",
      ];

      if (errosNegocio.includes(mensagem)) {
        res.status(422).json({ erro: mensagem });
        return;
      }

      console.error("Erro ao realizar lance:", erro);

      res.status(500).json({
        erro: "Não foi possível realizar o lance.",
      });
    }
  }
);

loteRoutes.delete("/:loteId", autenticar("LEILOEIRO"), async (req, res) => {
  const { loteId } = req.params;

  if (!UUID_VALIDO.test(loteId)) {
    res.status(400).json({
      erro: "Identificador do lote inválido.",
    });
    return;
  }

  try {
    const sessao = res.locals.sessao as Sessao;

    const resultado = await cancelarLote(loteId, sessao.usuarioId);

    publicarEventoLote(loteId, "LOTE_CANCELADO");
    res.status(200).json(resultado);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : "";

    if (mensagem === "Lote não encontrado.") {
      res.status(404).json({ erro: mensagem });
      return;
    }

    if (mensagem === "Você não pode cancelar este lote.") {
      res.status(403).json({ erro: mensagem });
      return;
    }

    if (
      mensagem === "Não é possível cancelar um lote que possui lances." ||
      mensagem === "O lote já está cancelado." ||
      mensagem === "Não é possível cancelar um lote encerrado."
    ) {
      res.status(409).json({ erro: mensagem });
      return;
    }

    console.error("Erro ao cancelar lote:", erro);

    res.status(500).json({
      erro: "Não foi possível cancelar o lote.",
    });
  }
});

loteRoutes.get("/:loteId/comprovante", async (req, res) => {
  if (!UUID_VALIDO.test(req.params.loteId)) {
    res.status(400).json({ erro: "Identificador do lote inválido." });
    return;
  }

  try {
    const comprovante = await consultarComprovante(req.params.loteId);

    res.status(200).json(comprovante);
  } catch (erro) {
    if (
      erro instanceof Error &&
      erro.message === "Comprovante não encontrado."
    ) {
      res.status(404).json({
        erro: "Comprovante não encontrado.",
      });
      return;
    }

    console.error("Erro ao consultar comprovante:", erro);

    res.status(500).json({
      erro: "Não foi possível consultar o comprovante.",
    });
  }
});

loteRoutes.get(
  "/:loteId/minha-situacao",
  autenticar("LICITANTE"),
  async (req, res) => {
    const { loteId } = req.params;

    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuid.test(loteId)) {
      res.status(400).json({
        erro: "Identificador do lote inválido.",
      });
      return;
    }

    try {
      const sessao = res.locals.sessao as Sessao;

      const resultado = await consultarMinhaSituacao(loteId, sessao.usuarioId);

      res.status(200).json(resultado);
    } catch (erro) {
      if (erro instanceof Error && erro.message === "Lote não encontrado.") {
        res.status(404).json({
          erro: "Lote não encontrado.",
        });
        return;
      }

      console.error("Erro ao consultar situação:", erro);

      res.status(500).json({
        erro: "Não foi possível consultar a situação.",
      });
    }
  }
);
