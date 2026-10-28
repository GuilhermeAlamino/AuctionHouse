
import { SituacaoLote } from "../../domain/enums/situacaoLote.js";
import { executarEmTransacao } from "../../infrastructure/database/transacao.js";

export async function consultarMinhaSituacao(
  loteId: string,
  licitanteId: string
) {
  return executarEmTransacao(async ({
    lotes,
    lances,
    comprovantes,
  }) => {
    const lote = await lotes.buscarPublicoPorId(loteId);

    if (!lote) {
      throw new Error("Lote não encontrado.");
    }

    const lider = await lances.buscarLider(loteId);

    const meusLances = await lances.buscarUltimosDoLicitante(
      licitanteId,
      loteId
    );

    const meuUltimoLance = meusLances.get(loteId) ?? null;

    const situacao = lote.obterSituacao();

    const souLider =
      lider?.lance.obterLicitanteId() === licitanteId;

    const arrematado =
      situacao === SituacaoLote.ENCERRADO && souLider;

    const comprovante = arrematado
      ? await comprovantes.buscarPorLote(loteId)
      : null;

    return {
      loteId,
      situacao,
      participando: meuUltimoLance !== null,
      liderando:
        situacao === SituacaoLote.EM_ANDAMENTO && souLider,
      meuUltimoLance:
        meuUltimoLance?.obterValorMonetario() ?? null,
      arrematado,
      liquidado: comprovante !== null,
      comprovanteId: comprovante?.obterId() ?? null,
    };
  });
}
