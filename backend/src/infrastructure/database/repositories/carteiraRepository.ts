import { eq } from "drizzle-orm";

import type { Transacao } from "../transacao.js";
import { carteiras } from "../schema.js";
import { Carteira } from "../../../domain/entities/carteira.js";

export class CarteiraRepository {
  constructor(private readonly tx: Transacao) {}

  public async buscarParaAtualizacao(
    usuariosIds: string[]
  ): Promise<Map<string, Carteira>> {
    const resultado = new Map<string, Carteira>();

    const ids = [...new Set(usuariosIds)].sort();

    for (const usuarioId of ids) {
      const [registro] = await this.tx
        .select()
        .from(carteiras)
        .where(eq(carteiras.usuarioId, usuarioId))
        .for("update");

      if (!registro) {
        throw new Error("Carteira não encontrada.");
      }

      resultado.set(usuarioId, new Carteira(registro));
    }

    return resultado;
  }

  public async buscarPorUsuario(usuarioId: string): Promise<Carteira | null> {
    const [registro] = await this.tx
      .select()
      .from(carteiras)
      .where(eq(carteiras.usuarioId, usuarioId))
      .limit(1);

    return registro ? new Carteira(registro) : null;
  }

  public async salvar(valores: Map<string, Carteira>): Promise<void> {
    for (const [usuarioId, carteira] of valores) {
      await this.tx
        .update(carteiras)
        .set({
          saldoTotal: carteira.obterSaldoTotal(),
          saldoComprometido: carteira.obterSaldoComprometido(),
        })
        .where(eq(carteiras.usuarioId, usuarioId));
    }
  }
}
