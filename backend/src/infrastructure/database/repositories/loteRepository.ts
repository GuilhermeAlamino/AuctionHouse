import { eq, and, exists, isNull, lte, notExists, or, desc, inArray } from "drizzle-orm";

import type { Transacao } from "../transacao.js";
import { lotes, itens, lances, comprovantes } from "../schema.js";

import { Lote } from "../../../domain/entities/lote.js";
import { Item } from "../../../domain/entities/item.js";

export class LoteRepository {
  constructor(private readonly tx: Transacao) {}

  public async buscarParaAtualizacao(id: string): Promise<Lote | null> {
    const [registro] = await this.tx
      .select()
      .from(lotes)
      .where(eq(lotes.id, id))
      .for("update");

    if (!registro) {
      return null;
    }

    const [item] = await this.tx
      .select()
      .from(itens)
      .where(eq(itens.id, registro.itemId));

    if (!item) {
      throw new Error("Item do lote não encontrado.");
    }

    return new Lote({
      id: registro.id,
      leiloeiroId: registro.leiloeiroId,
      item: new Item(item),
      lanceInicial: registro.lanceInicial,
      incrementoMinimo: registro.incrementoMinimo,
      horarioInicio: registro.horarioInicio,
      horarioFim: registro.horarioFim,
      canceladoEm: registro.canceladoEm,
      prorrogado: registro.prorrogado,
      encerradoEm: registro.encerradoEm,
    });
  }

  public async criar(dados: {
    id: string;
    leiloeiroId: string;
    item: {
      id: string;
      titulo: string;
      descricao: string;
      imagem: string;
    };
    lanceInicial: number;
    incrementoMinimo: number;
    horarioInicio: Date;
    horarioFim: Date;
  }): Promise<void> {
    await this.tx.insert(itens).values(dados.item);

    await this.tx.insert(lotes).values({
      id: dados.id,
      leiloeiroId: dados.leiloeiroId,
      itemId: dados.item.id,
      lanceInicial: dados.lanceInicial,
      incrementoMinimo: dados.incrementoMinimo,
      horarioInicio: dados.horarioInicio,
      horarioFim: dados.horarioFim,
    });
  }

  public async listarPendentesProcessamento(): Promise<string[]> {
    const possuiLances = this.tx
      .select({ id: lances.id })
      .from(lances)
      .where(eq(lances.loteId, lotes.id));

    const possuiComprovante = this.tx
      .select({ id: comprovantes.id })
      .from(comprovantes)
      .where(eq(comprovantes.loteId, lotes.id));

    const registros = await this.tx
      .select({ id: lotes.id })
      .from(lotes)
      .where(
        and(
          lte(lotes.horarioFim, new Date()),
          isNull(lotes.canceladoEm),
          or(
            isNull(lotes.encerradoEm),
            and(exists(possuiLances), notExists(possuiComprovante))
          )
        )
      );

    return registros.map((registro) => registro.id);
  }

  public async salvarEncerramento(lote: Lote): Promise<void> {
    const encerradoEm = lote.obterEncerradoEm();

    if (!encerradoEm) {
      throw new Error("O lote ainda não foi encerrado.");
    }

    await this.tx
      .update(lotes)
      .set({ encerradoEm })
      .where(eq(lotes.id, lote.obterId()));
  }

  public async salvarProrrogacao(lote: Lote): Promise<void> {
    await this.tx
      .update(lotes)
      .set({
        horarioFim: lote.obterHorarioFim(),
        prorrogado: true,
      })
      .where(eq(lotes.id, lote.obterId()));
  }

  private reconstruirLote(
    registro: typeof lotes.$inferSelect,
    item: typeof itens.$inferSelect
  ): Lote {
    return new Lote({
      id: registro.id,
      leiloeiroId: registro.leiloeiroId,
      item: new Item(item),
      lanceInicial: registro.lanceInicial,
      incrementoMinimo: registro.incrementoMinimo,
      horarioInicio: registro.horarioInicio,
      horarioFim: registro.horarioFim,
      canceladoEm: registro.canceladoEm,
      prorrogado: registro.prorrogado,
      encerradoEm: registro.encerradoEm,
    });
  }

  public async listarPublicos(): Promise<Lote[]> {
    const registros = await this.tx
      .select({
        lote: lotes,
        item: itens,
      })
      .from(lotes)
      .innerJoin(itens, eq(lotes.itemId, itens.id))
      .where(isNull(lotes.canceladoEm))
      .orderBy(desc(lotes.horarioInicio));

    return registros.map(({ lote, item }) => this.reconstruirLote(lote, item));
  }

  public async salvarCancelamento(lote: Lote): Promise<void> {
    const canceladoEm = lote.obterCanceladoEm();

    if (!canceladoEm) {
      throw new Error("O lote ainda não foi cancelado.");
    }

    await this.tx
      .update(lotes)
      .set({ canceladoEm })
      .where(eq(lotes.id, lote.obterId()));
  }

  public async buscarPorIds(ids: string[]): Promise<Lote[]> {
    if (ids.length === 0) {
      return [];
    }

    const registros = await this.tx
      .select({
        lote: lotes,
        item: itens,
      })
      .from(lotes)
      .innerJoin(itens, eq(lotes.itemId, itens.id))
      .where(inArray(lotes.id, ids));

    return registros.map(({ lote, item }) => this.reconstruirLote(lote, item));
  }

  public async listarDoLeiloeiro(leiloeiroId: string): Promise<Lote[]> {
    const registros = await this.tx
      .select({
        lote: lotes,
        item: itens,
      })
      .from(lotes)
      .innerJoin(itens, eq(lotes.itemId, itens.id))
      .where(eq(lotes.leiloeiroId, leiloeiroId))
      .orderBy(desc(lotes.horarioInicio));

    return registros.map(({ lote, item }) => this.reconstruirLote(lote, item));
  }

  public async buscarPublicoPorId(id: string): Promise<Lote | null> {
    const [registro] = await this.tx
      .select({
        lote: lotes,
        item: itens,
      })
      .from(lotes)
      .innerJoin(itens, eq(lotes.itemId, itens.id))
      .where(and(eq(lotes.id, id), isNull(lotes.canceladoEm)))
      .limit(1);

    if (!registro) {
      return null;
    }

    return this.reconstruirLote(registro.lote, registro.item);
  }
}
