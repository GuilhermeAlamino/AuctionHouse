import { SituacaoLote } from "../../domain/enums/situacaoLote.js";
import { executarEmTransacao } from "../../infrastructure/database/transacao.js";

export async function consultarLotesLeiloeiro(leiloeiroId: string) {
  return executarEmTransacao(async ({ lotes, lances, comprovantes }) => {
    const registros = await lotes.listarDoLeiloeiro(leiloeiroId);

    const loteIds = registros.map((lote) => lote.obterId());

    const lideres = await lances.buscarLideresPorLotes(loteIds);

    const quantidades = await lances.contarPorLotes(loteIds);

    const comprovantesPorLote = await comprovantes.buscarPorLotes(loteIds);

    const agora = new Date();

    const resultado = registros.map((lote) => {
      const loteId = lote.obterId();
      const situacao = lote.obterSituacao(agora);
      const lider = lideres.get(loteId);
      const comprovante = comprovantesPorLote.get(loteId);

      const encerrado = situacao === SituacaoLote.ENCERRADO;
      const arrematado = encerrado && lider !== undefined;
      const liquidado = comprovante !== undefined;

      const valorArrematacao = arrematado ? lider.obterValorMonetario() : null;

      const valorRecebido =
        liquidado && lider ? lider.obterValorMonetario() : 0;

      return {
        loteId,
        titulo: lote.obterItem().obterTitulo(),
        imagem: lote.obterItem().obterImagem(),
        situacao,
        horarioInicio: lote.obterHorarioInicio(),
        horarioFim: lote.obterHorarioFim(),
        quantidadeLances: quantidades.get(loteId) ?? 0,
        lanceAtual: lider?.obterValorMonetario() ?? null,
        valorArrematacao,
        valorRecebido,
        arrematado,
        liquidado,
        comprovanteId: comprovante?.obterId() ?? null,
      };
    });

    const totalRecebido = resultado.reduce(
      (total, lote) => total + lote.valorRecebido,
      0
    );

    return {
      totalRecebido,
      quantidadeLotes: resultado.length,
      lotes: resultado,
    };
  });
}
