import { executarEmTransacao } from "../../infrastructure/database/transacao.js";

export async function cancelarLote(
  loteId: string,
  leiloeiroId: string
) {
  return executarEmTransacao(async ({
    usuarios,
    lotes,
    lances,
  }) => {
    const lote = await lotes.buscarParaAtualizacao(loteId);

    if (!lote) {
      throw new Error("Lote não encontrado.");
    }

    const papel = await usuarios.buscarPapel(leiloeiroId);

    if (
      papel !== "LEILOEIRO" ||
      lote.obterLeiloeiroId() !== leiloeiroId
    ) {
      throw new Error("Você não pode cancelar este lote.");
    }

    const possuiLances = await lances.possuiLances(loteId);

    lote.cancelar(possuiLances);

    await lotes.salvarCancelamento(lote);

    return {
      id: lote.obterId(),
      situacao: lote.obterSituacao(),
      canceladoEm: lote.obterCanceladoEm(),
    };
  });
}
