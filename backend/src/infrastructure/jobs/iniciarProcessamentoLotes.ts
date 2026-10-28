import { processarLotesVencidos } from "../../application/use-cases/processarLotesVencidos.js";

export function iniciarProcessamentoLotes(): void {
  let emExecucao = false;

  async function executar(): Promise<void> {
    if (emExecucao) {
      return;
    }

    emExecucao = true;

    try {
      const resultado = await processarLotesVencidos();

      if (resultado.encerrados > 0 || resultado.liquidados > 0) {
        console.info("Lotes processados:", resultado);
      }

      for (const falha of resultado.falhas) {
        console.error(
          `Falha ao processar lote ${falha.loteId}: ${falha.mensagem}`
        );
      }
    } catch (erro) {
      console.error("Erro no processamento de lotes:", erro);
    } finally {
      emExecucao = false;
    }
  }

  // Executa ao iniciar a aplicação.
  void executar();

  // Verifica novamente a cada cinco segundos.
  setInterval(() => {
    void executar();
  }, 5000);
}
