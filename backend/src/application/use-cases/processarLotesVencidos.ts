import { executarEmTransacao } from "../../infrastructure/database/transacao.js";
import { publicarEventoLote } from "../../infrastructure/eventos/eventosLote.js";

import { encerrarLote } from "./encerrarLote.js";
import { liquidarArrematacao } from "./liquidarArrematacao.js";

type Resultado = {
  encerrados: number;
  liquidados: number;
  falhas: Array<{
    loteId: string;
    mensagem: string;
  }>;
};

export async function processarLotesVencidos(): Promise<Resultado> {
  const pendentes = await executarEmTransacao(({ lotes }) =>
    lotes.listarPendentesProcessamento()
  );

  const resultado: Resultado = {
    encerrados: 0,
    liquidados: 0,
    falhas: [],
  };

  for (const loteId of pendentes) {
    try {
      const encerramento = await encerrarLote(loteId);

      if (encerramento.processadoAgora) {
        resultado.encerrados++;
        publicarEventoLote(loteId, "LOTE_ENCERRADO");
      }

      if (encerramento.situacao === "AGUARDANDO_LIQUIDACAO") {
        await liquidarArrematacao(loteId);
        resultado.liquidados++;
        publicarEventoLote(loteId, "LOTE_LIQUIDADO");
      }
    } catch (erro) {
      resultado.falhas.push({
        loteId,
        mensagem: erro instanceof Error ? erro.message : "Erro desconhecido.",
      });
    }
  }

  return resultado;
}
