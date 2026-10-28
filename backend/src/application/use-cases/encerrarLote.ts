
import { executarEmTransacao } from "../../infrastructure/database/transacao.js";

type ResultadoEncerramento = {
  loteId: string;
  situacao: "SEM_LANCES" | "AGUARDANDO_LIQUIDACAO";
  lanceVencedorId: string | null;
  processadoAgora: boolean;
};

export async function encerrarLote(
  loteId: string
): Promise<ResultadoEncerramento> {
  return executarEmTransacao(async ({ lotes, lances }) => {
    const lote = await lotes.buscarParaAtualizacao(loteId);

    if (!lote) {
      throw new Error("Lote não encontrado.");
    }

    const processadoAgora = lote.encerrar();

    const lider = await lances.buscarLider(loteId);

    if (processadoAgora) {
      await lotes.salvarEncerramento(lote);
    }

    return {
      loteId,
      situacao: lider
        ? "AGUARDANDO_LIQUIDACAO"
        : "SEM_LANCES",
      lanceVencedorId: lider?.lance.obterId() ?? null,
      processadoAgora,
    };
  });
}
