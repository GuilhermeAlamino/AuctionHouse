import { SituacaoLote } from "../../domain/enums/situacaoLote.js";
import { executarEmTransacao } from "../../infrastructure/database/transacao.js";

export async function consultarParticipacoes(licitanteId: string) {
  return executarEmTransacao(async ({ lotes, lances, comprovantes }) => {
    const meusLances = await lances.buscarUltimosDoLicitante(licitanteId);

    const loteIds = [...meusLances.keys()];

    if (loteIds.length === 0) {
      return [];
    }

    const registros = await lotes.buscarPorIds(loteIds);

    const lideres = await lances.buscarLideresPorLotes(loteIds);

    const comprovantesPorLote = await comprovantes.buscarPorLotes(loteIds);

    const agora = new Date();

    return registros.map((lote) => {
      const loteId = lote.obterId();
      const situacao = lote.obterSituacao(agora);

      const meuLance = meusLances.get(loteId)!;
      const lider = lideres.get(loteId);
      const comprovante = comprovantesPorLote.get(loteId);

      const encerrado = situacao === SituacaoLote.ENCERRADO;

      const arrematado = encerrado && lider?.obterLicitanteId() === licitanteId;

      const liquidado = arrematado && comprovante !== undefined;

      return {
        loteId,
        titulo: lote.obterItem().obterTitulo(),
        imagem: lote.obterItem().obterImagem(),
        situacao,
        meuMaiorLance: meuLance.obterValorMonetario(),
        lanceAtual: lider?.obterValorMonetario() ?? null,
        valorVencedor: encerrado ? lider?.obterValorMonetario() ?? null : null,
        liderando:
          situacao === SituacaoLote.EM_ANDAMENTO &&
          lider?.obterLicitanteId() === licitanteId,
        arrematado,
        liquidado,
        comprovanteId: liquidado ? comprovante.obterId() : null,
      };
    });
  });
}
