import { Lote } from "../../domain/entities/lote.js";
import { executarEmTransacao } from "../../infrastructure/database/transacao.js";

function apresentarLote(lote: Lote, agora: Date) {
  const item = lote.obterItem();

  return {
    id: lote.obterId(),
    item: {
      id: item.obterId(),
      titulo: item.obterTitulo(),
      descricao: item.obterDescricao(),
      imagem: item.obterImagem(),
    },
    lanceInicial: lote.obterLanceInicial(),
    incrementoMinimo: lote.obterIncrementoMinimo(),
    horarioInicio: lote.obterHorarioInicio(),
    horarioFim: lote.obterHorarioFim(),
    situacao: lote.obterSituacao(agora),
  };
}

export async function consultarLotes() {
  return executarEmTransacao(async ({ lotes, lances }) => {
    const registros = await lotes.listarPublicos();

    const ids = registros.map((lote) => lote.obterId());

    const valoresLideres = await lances.buscarValoresLideres(ids);

    const agora = new Date();

    return registros.map((lote) => {
      const lanceAtual = valoresLideres.get(lote.obterId()) ?? null;

      return {
        ...apresentarLote(lote, agora),
        lanceAtual,
        valorAtual: lanceAtual ?? lote.obterLanceInicial(),
      };
    });
  });
}

export async function consultarLote(loteId: string) {
  return executarEmTransacao(async ({ lotes, lances }) => {
    const lote = await lotes.buscarPublicoPorId(loteId);

    if (!lote) {
      throw new Error("Lote não encontrado.");
    }

    const registros = await lances.listarParaAuditoria(loteId);

    const apelidos = new Map<string, string>();

    const historico = registros.map((registro) => {
      if (!apelidos.has(registro.licitanteId)) {
        apelidos.set(registro.licitanteId, `Licitante ${apelidos.size + 1}`);
      }

      return {
        sequencia: registro.sequencia,
        licitante: apelidos.get(registro.licitanteId)!,
        valorMonetario: registro.valorMonetario,
        realizadoEm: registro.realizadoEm,
      };
    });

    const lider = historico.at(-1) ?? null;

    const lanceAtual = lider?.valorMonetario ?? null;

    const valorMinimo =
      lanceAtual === null
        ? lote.obterLanceInicial()
        : lanceAtual + lote.obterIncrementoMinimo();

    return {
      ...apresentarLote(lote, new Date()),
      lanceAtual,
      valorAtual: lanceAtual ?? lote.obterLanceInicial(),
      proximoLanceMinimo: Number.isSafeInteger(valorMinimo)
        ? valorMinimo
        : null,
      quantidadeLances: historico.length,
      lider,
      historico,
    };
  });
}
