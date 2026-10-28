import { eq, inArray } from "drizzle-orm";

import type { Transacao } from "../transacao.js";
import { comprovantes, lances, lotes, itens } from "../schema.js";
import { Comprovante } from "../../../domain/entities/comprovante.js";

export class ComprovanteRepository {
  constructor(private readonly tx: Transacao) {}

  public async buscarPorLote(loteId: string): Promise<Comprovante | null> {
    const [registro] = await this.tx
      .select()
      .from(comprovantes)
      .where(eq(comprovantes.loteId, loteId))
      .limit(1);

    if (!registro) {
      return null;
    }

    return new Comprovante({
      id: registro.id,
      loteId: registro.loteId,
      licitanteId: registro.licitanteId,
      lanceVencedorId: registro.lanceVencedorId,
    });
  }

  public async buscarPublicoPorLote(loteId: string) {
    const [registro] = await this.tx
      .select({
        id: comprovantes.id,
        loteId: comprovantes.loteId,
        titulo: itens.titulo,
        imagem: itens.imagem,
        valorArrematacao: lances.valorMonetario,
        lanceRealizadoEm: lances.realizadoEm,
        encerradoEm: lotes.encerradoEm,
      })
      .from(comprovantes)
      .innerJoin(lances, eq(comprovantes.lanceVencedorId, lances.id))
      .innerJoin(lotes, eq(comprovantes.loteId, lotes.id))
      .innerJoin(itens, eq(lotes.itemId, itens.id))
      .where(eq(comprovantes.loteId, loteId))
      .limit(1);

    return registro ?? null;
  }

  public async buscarPorLotes(
    loteIds: string[]
  ): Promise<Map<string, Comprovante>> {
    if (loteIds.length === 0) {
      return new Map();
    }

    const registros = await this.tx
      .select()
      .from(comprovantes)
      .where(inArray(comprovantes.loteId, loteIds));

    return new Map(
      registros.map((registro) => [
        registro.loteId,
        new Comprovante({
          id: registro.id,
          loteId: registro.loteId,
          licitanteId: registro.licitanteId,
          lanceVencedorId: registro.lanceVencedorId,
        }),
      ])
    );
  }

  public async registrar(comprovante: Comprovante): Promise<void> {
    await this.tx.insert(comprovantes).values({
      id: comprovante.obterId(),
      loteId: comprovante.obterLoteId(),
      licitanteId: comprovante.obterLicitanteId(),
      lanceVencedorId: comprovante.obterLanceVencedorId(),
    });
  }
}
