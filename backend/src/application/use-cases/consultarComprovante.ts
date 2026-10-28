import { executarEmTransacao } from "../../infrastructure/database/transacao.js";

export async function consultarComprovante(loteId: string) {
  return executarEmTransacao(async ({ comprovantes }) => {
    const registro =
      await comprovantes.buscarPublicoPorLote(loteId);

    if (!registro) {
      throw new Error("Comprovante não encontrado.");
    }

    return {
      id: registro.id,
      loteId: registro.loteId,
      item: {
        titulo: registro.titulo,
        imagem: registro.imagem,
      },
      valorArrematacao: registro.valorArrematacao,
      lanceRealizadoEm: registro.lanceRealizadoEm,
      encerradoEm: registro.encerradoEm,
      vencedor: "Licitante vencedor",
    };
  });
}
