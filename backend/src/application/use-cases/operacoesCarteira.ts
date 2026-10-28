
import { Carteira } from "../../domain/entities/carteira.js";
import { executarEmTransacao } from "../../infrastructure/database/transacao.js";

function apresentarCarteira(carteira: Carteira) {
  return {
    saldoTotal: carteira.obterSaldoTotal(),
    saldoComprometido: carteira.obterSaldoComprometido(),
    saldoDisponivel: carteira.obterSaldoDisponivel(),
  };
}

export async function consultarCarteira(usuarioId: string) {
  return executarEmTransacao(async ({ carteiras }) => {
    const carteira = await carteiras.buscarPorUsuario(usuarioId);

    if (!carteira) {
      throw new Error("Carteira não encontrada.");
    }

    return apresentarCarteira(carteira);
  });
}

export async function depositarSaldo(
  usuarioId: string,
  valorMonetario: number
) {
  return executarEmTransacao(async ({ usuarios, carteiras }) => {
    const papel = await usuarios.buscarPapel(usuarioId);

    if (papel !== "LICITANTE") {
      throw new Error("Apenas licitantes podem depositar saldo.");
    }

    const carteirasEncontradas =
      await carteiras.buscarParaAtualizacao([usuarioId]);

    const carteira = carteirasEncontradas.get(usuarioId);

    if (!carteira) {
      throw new Error("Carteira não encontrada.");
    }

    carteira.depositarSaldo(valorMonetario);

    await carteiras.salvar(carteirasEncontradas);

    return apresentarCarteira(carteira);
  });
}
