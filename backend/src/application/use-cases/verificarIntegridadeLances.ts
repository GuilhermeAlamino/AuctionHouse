import { executarEmTransacao } from "../../infrastructure/database/transacao.js";

import {
  verificarTrilhaLances,
  type SituacaoAuditoria,
} from "../../infrastructure/auditoria/trilhaLances.js";

type LancePublico = {
  sequencia: number;
  licitante: string;
  valorMonetario: number;
  realizadoEm: string;
};

type Resultado = {
  loteId: string;
  situacao: SituacaoAuditoria;
  fonteHistorico: "TRILHA_ASSINADA" | "BANCO_NAO_VERIFICADO";
  quantidadeLances: number;
  historico: LancePublico[];
};

export async function verificarIntegridadeLances(
  loteId: string
): Promise<Resultado> {
  return executarEmTransacao(async ({ lotes, lances }) => {
    const lote = await lotes.buscarParaAtualizacao(loteId);

    if (!lote) {
      throw new Error("Lote não encontrado.");
    }

    const historicoBanco = await lances.listarParaAuditoria(
      loteId
    );

    const verificacao = await verificarTrilhaLances(
      loteId,
      historicoBanco
    );

    const possuiTrilha =
      verificacao.historicoAssinado.length > 0;

    // Quando a trilha é válida, mostramos o histórico
    // assinado, inclusive se algum lance sumiu do banco.
    const origem = possuiTrilha
      ? verificacao.historicoAssinado
      : historicoBanco;

    const apelidos = new Map<string, string>();

    const historico = origem.map((lance) => {
      if (!apelidos.has(lance.licitanteId)) {
        apelidos.set(
          lance.licitanteId,
          `Licitante ${apelidos.size + 1}`
        );
      }

      return {
        sequencia: lance.sequencia,
        licitante: apelidos.get(lance.licitanteId)!,
        valorMonetario: lance.valorMonetario,
        realizadoEm: lance.realizadoEm,
      };
    });

    return {
      loteId,
      situacao: verificacao.situacao,
      fonteHistorico: possuiTrilha
        ? "TRILHA_ASSINADA"
        : "BANCO_NAO_VERIFICADO",
      quantidadeLances: historico.length,
      historico,
    };
  });
}
