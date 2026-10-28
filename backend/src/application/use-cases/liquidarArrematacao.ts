
import { randomUUID } from "node:crypto";

import { executarEmTransacao } from "../../infrastructure/database/transacao.js";
import { Comprovante } from "../../domain/entities/comprovante.js";
import { SituacaoLote } from "../../domain/enums/situacaoLote.js";

export async function liquidarArrematacao(
  loteId: string
): Promise<Comprovante> {
  return executarEmTransacao(async ({
    lotes,
    lances,
    carteiras,
    comprovantes,
  }) => {
    const lote = await lotes.buscarParaAtualizacao(loteId);

    if (!lote) {
      throw new Error("Lote não encontrado.");
    }

    if (
      lote.obterSituacao() !== SituacaoLote.ENCERRADO ||
      lote.obterEncerradoEm() === null
    ) {
      throw new Error("O lote ainda não foi encerrado.");
    }

    const existente = await comprovantes.buscarPorLote(loteId);

    if (existente) {
      return existente;
    }

    const lider = await lances.buscarLider(loteId);

    if (!lider) {
      throw new Error("O lote não possui lance vencedor.");
    }

    const lanceVencedor = lider.lance;
    const licitanteId = lanceVencedor.obterLicitanteId();
    const leiloeiroId = lote.obterLeiloeiroId();
    const valor = lanceVencedor.obterValorMonetario();

    const carteirasEnvolvidas =
      await carteiras.buscarParaAtualizacao([
        licitanteId,
        leiloeiroId,
      ]);

    const carteiraVencedor = carteirasEnvolvidas.get(licitanteId);
    const carteiraLeiloeiro = carteirasEnvolvidas.get(leiloeiroId);

    if (!carteiraVencedor || !carteiraLeiloeiro) {
      throw new Error("Carteira não encontrada.");
    }

    carteiraVencedor.debitar(valor);
    carteiraLeiloeiro.creditar(valor);

    const comprovante = new Comprovante({
      id: randomUUID(),
      loteId,
      licitanteId,
      lanceVencedorId: lanceVencedor.obterId(),
    });

    await carteiras.salvar(carteirasEnvolvidas);
    await comprovantes.registrar(comprovante);

    return comprovante;
  });
}
