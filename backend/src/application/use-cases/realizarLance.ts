import { randomUUID } from "node:crypto";

import { executarEmTransacao } from "../../infrastructure/database/transacao.js";
import { Lance } from "../../domain/entities/lance.js";

type Entrada = {
  loteId: string;
  licitanteId: string;
  valorMonetario: number;
};

export async function realizarLance(entrada: Entrada): Promise<Lance> {
  const { loteId, licitanteId, valorMonetario } = entrada;

  return executarEmTransacao(async ({
    lotes,
    lances,
    carteiras,
    usuarios,
  }) => {
    const lote = await lotes.buscarParaAtualizacao(loteId);

    if (!lote) {
      throw new Error("Lote não encontrado.");
    }

    const papel = await usuarios.buscarPapel(licitanteId);

    if (papel !== "LICITANTE") {
      throw new Error("Apenas licitantes podem realizar lances.");
    }

    const lider = await lances.buscarLider(loteId);

    const participantes = [
      licitanteId,
      ...(lider ? [lider.lance.obterLicitanteId()] : []),
    ];

    const carteirasEnvolvidas =
      await carteiras.buscarParaAtualizacao(participantes);

    const agora = new Date();

    lote.validarOferta(
      licitanteId,
      valorMonetario,
      lider?.lance ?? null,
      agora
    );

    const carteiraAtual = carteirasEnvolvidas.get(licitanteId);

    if (!carteiraAtual) {
      throw new Error("Carteira não encontrada.");
    }

    carteiraAtual.comprometer(valorMonetario);

    if (lider) {
      const carteiraAnterior = carteirasEnvolvidas.get(
        lider.lance.obterLicitanteId()
      );

      if (!carteiraAnterior) {
        throw new Error("Carteira não encontrada.");
      }

      carteiraAnterior.liberarSaldo(
        lider.lance.obterValorMonetario()
      );
    }

    const lance = new Lance({
      id: randomUUID(),
      loteId,
      licitanteId,
      valorMonetario,
      realizadoEm: agora,
    });

    const prorrogou = lote.prorrogarFim(agora);

    await carteiras.salvar(carteirasEnvolvidas);

    await lances.registrar(
      lance,
      (lider?.sequencia ?? 0) + 1
    );

    if (prorrogou) {
      await lotes.salvarProrrogacao(lote);
    }

    return lance;
  });
}
