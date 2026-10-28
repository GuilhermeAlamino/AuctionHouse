import { asc, desc, eq, inArray, and, count } from "drizzle-orm";

import type { Transacao } from "../transacao.js";
import { lances } from "../schema.js";
import { Lance } from "../../../domain/entities/lance.js";
import { registrarLanceNaTrilha } from "../../auditoria/trilhaLances.js";
import type { DadosLanceAuditoria } from "../../auditoria/trilhaLances.js";

export type LanceLider = {
  lance: Lance;
  sequencia: number;
};

export class LanceRepository {
  constructor(private readonly tx: Transacao) {}

  public async buscarLider(loteId: string): Promise<LanceLider | null> {
    const [registro] = await this.tx
      .select()
      .from(lances)
      .where(eq(lances.loteId, loteId))
      .orderBy(desc(lances.sequencia))
      .limit(1);

    if (!registro) {
      return null;
    }

    return {
      sequencia: registro.sequencia,
      lance: new Lance({
        id: registro.id,
        loteId: registro.loteId,
        licitanteId: registro.licitanteId,
        valorMonetario: registro.valorMonetario,
        realizadoEm: registro.realizadoEm,
      }),
    };
  }

  public async registrar(lance: Lance, sequencia: number): Promise<void> {
    const realizadoEm = lance.obterRealizadoEm();

    await this.tx.insert(lances).values({
      id: lance.obterId(),
      loteId: lance.obterLoteId(),
      licitanteId: lance.obterLicitanteId(),
      valorMonetario: lance.obterValorMonetario(),
      realizadoEm: lance.obterRealizadoEm(),
      sequencia,
    });

    await registrarLanceNaTrilha({
      id: lance.obterId(),
      loteId: lance.obterLoteId(),
      licitanteId: lance.obterLicitanteId(),
      valorMonetario: lance.obterValorMonetario(),
      realizadoEm: realizadoEm.toISOString(),
      sequencia,
    });
  }

  public async listarParaAuditoria(
    loteId: string
  ): Promise<DadosLanceAuditoria[]> {
    const registros = await this.tx
      .select()
      .from(lances)
      .where(eq(lances.loteId, loteId))
      .orderBy(asc(lances.sequencia));

    return registros.map((registro) => ({
      id: registro.id,
      loteId: registro.loteId,
      licitanteId: registro.licitanteId,
      valorMonetario: registro.valorMonetario,
      realizadoEm: registro.realizadoEm.toISOString(),
      sequencia: registro.sequencia,
    }));
  }

  public async possuiLances(loteId: string): Promise<boolean> {
    const [registro] = await this.tx
      .select({ id: lances.id })
      .from(lances)
      .where(eq(lances.loteId, loteId))
      .limit(1);

    return registro !== undefined;
  }

  public async buscarUltimosDoLicitante(
    licitanteId: string,
    loteId?: string
  ): Promise<Map<string, Lance>> {
    const registros = await this.tx
      .selectDistinctOn([lances.loteId])
      .from(lances)
      .where(
        loteId
          ? and(eq(lances.licitanteId, licitanteId), eq(lances.loteId, loteId))
          : eq(lances.licitanteId, licitanteId)
      )
      .orderBy(lances.loteId, desc(lances.sequencia));

    return new Map(
      registros.map((registro) => [
        registro.loteId,
        new Lance({
          id: registro.id,
          loteId: registro.loteId,
          licitanteId: registro.licitanteId,
          valorMonetario: registro.valorMonetario,
          realizadoEm: registro.realizadoEm,
        }),
      ])
    );
  }

  public async buscarLideresPorLotes(
    loteIds: string[]
  ): Promise<Map<string, Lance>> {
    if (loteIds.length === 0) {
      return new Map();
    }

    const registros = await this.tx
      .selectDistinctOn([lances.loteId])
      .from(lances)
      .where(inArray(lances.loteId, loteIds))
      .orderBy(lances.loteId, desc(lances.sequencia));

    return new Map(
      registros.map((registro) => [
        registro.loteId,
        new Lance({
          id: registro.id,
          loteId: registro.loteId,
          licitanteId: registro.licitanteId,
          valorMonetario: registro.valorMonetario,
          realizadoEm: registro.realizadoEm,
        }),
      ])
    );
  }

  public async contarPorLotes(loteIds: string[]): Promise<Map<string, number>> {
    if (loteIds.length === 0) {
      return new Map();
    }

    const registros = await this.tx
      .select({
        loteId: lances.loteId,
        quantidade: count(),
      })
      .from(lances)
      .where(inArray(lances.loteId, loteIds))
      .groupBy(lances.loteId);

    return new Map(
      registros.map((registro) => [registro.loteId, registro.quantidade])
    );
  }

  public async buscarValoresLideres(
    loteIds: string[]
  ): Promise<Map<string, number>> {
    if (loteIds.length === 0) {
      return new Map();
    }

    const registros = await this.tx
      .selectDistinctOn([lances.loteId], {
        loteId: lances.loteId,
        valorMonetario: lances.valorMonetario,
      })
      .from(lances)
      .where(inArray(lances.loteId, loteIds))
      .orderBy(lances.loteId, desc(lances.sequencia));

    return new Map<string, number>(
      registros.map((registro) => [registro.loteId, registro.valorMonetario])
    );
  }
}
