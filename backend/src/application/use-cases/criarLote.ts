import { randomUUID } from "node:crypto";

import { Item } from "../../domain/entities/item.js";
import { Lote } from "../../domain/entities/lote.js";
import { executarEmTransacao } from "../../infrastructure/database/transacao.js";

type Entrada = {
  leiloeiroId: string;
  produtoId: number;
  lanceInicial: number;
  incrementoMinimo: number;
  horarioInicio: Date;
  horarioFim: Date;
};

type ProdutoExterno = {
  titulo: string;
  descricao: string;
  imagem: string;
};

async function consultarProdutoExterno(
  produtoId: number
): Promise<ProdutoExterno> {
  let resposta: Response;

  try {
    resposta = await fetch(`https://dummyjson.com/products/${produtoId}`, {
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    throw new Error("Falha na consulta ao catálogo de produtos.");
  }

  if (resposta.status === 404) {
    throw new Error("Produto não encontrado.");
  }

  if (!resposta.ok) {
    throw new Error("Falha na consulta ao catálogo de produtos.");
  }

  let produto: unknown;

  try {
    produto = await resposta.json();
  } catch {
    throw new Error("Produto externo inválido.");
  }

  if (
    !produto ||
    typeof produto !== "object" ||
    !("id" in produto) ||
    produto.id !== produtoId ||
    !("title" in produto) ||
    typeof produto.title !== "string" ||
    !("description" in produto) ||
    typeof produto.description !== "string" ||
    !("thumbnail" in produto) ||
    typeof produto.thumbnail !== "string"
  ) {
    throw new Error("Produto externo inválido.");
  }

  return {
    titulo: produto.title.trim(),
    descricao: produto.description.trim(),
    imagem: produto.thumbnail.trim(),
  };
}

export async function criarLote(entrada: Entrada) {
  if (!Number.isSafeInteger(entrada.produtoId) || entrada.produtoId <= 0) {
    throw new Error("Produto inválido.");
  }

  if (
    !(entrada.horarioInicio instanceof Date) ||
    !(entrada.horarioFim instanceof Date) ||
    !Number.isFinite(entrada.horarioInicio.getTime()) ||
    !Number.isFinite(entrada.horarioFim.getTime())
  ) {
    throw new Error("Datas inválidas.");
  }

  const produto = await consultarProdutoExterno(entrada.produtoId);

  const itemDados = {
    id: randomUUID(),
    ...produto,
  };

  const item = new Item(itemDados);

  const lote = new Lote({
    id: randomUUID(),
    leiloeiroId: entrada.leiloeiroId,
    item,
    lanceInicial: entrada.lanceInicial,
    incrementoMinimo: entrada.incrementoMinimo,
    horarioInicio: entrada.horarioInicio,
    horarioFim: entrada.horarioFim,
    canceladoEm: null,
    encerradoEm: null,
    prorrogado: false,
  });

  if (lote.obterHorarioFim().getTime() <= Date.now()) {
    throw new Error("O horário de término deve ser futuro.");
  }

  return executarEmTransacao(async ({ usuarios, lotes }) => {
    const papel = await usuarios.buscarPapel(entrada.leiloeiroId);

    if (papel !== "LEILOEIRO") {
      throw new Error("Apenas leiloeiros podem criar lotes.");
    }

    await lotes.criar({
      id: lote.obterId(),
      leiloeiroId: lote.obterLeiloeiroId(),
      item: itemDados,
      lanceInicial: lote.obterLanceInicial(),
      incrementoMinimo: lote.obterIncrementoMinimo(),
      horarioInicio: lote.obterHorarioInicio(),
      horarioFim: lote.obterHorarioFim(),
    });

    return {
      id: lote.obterId(),
      item: itemDados,
      lanceInicial: entrada.lanceInicial,
      incrementoMinimo: entrada.incrementoMinimo,
      horarioInicio: entrada.horarioInicio,
      horarioFim: entrada.horarioFim,
    };
  });
}
