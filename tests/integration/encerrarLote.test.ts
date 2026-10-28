import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { encerrarLote } from "../../backend/src/application/use-cases/encerrarLote.js";
import { db, pool } from "../../backend/src/infrastructure/database/conexao.js";
import {
  usuarios,
  itens,
  lotes,
  lances,
} from "../../backend/src/infrastructure/database/schema.js";

describe("EncerrarLote - Integração", () => {
  const ids = {
    leiloeiro: randomUUID(),
    licitante: randomUUID(),
    item: randomUUID(),
    lote: randomUUID(),
  };

  async function limparBanco(): Promise<void> {
    const resultado = await pool.query(
      "SELECT current_database() AS nome"
    );

    if (resultado.rows[0]?.nome !== "casa_leiloes_test") {
      throw new Error("Banco de testes inválido.");
    }

    await pool.query(`
      TRUNCATE TABLE
        comprovantes, lances, lotes,
        carteiras, itens, usuarios
      RESTART IDENTITY CASCADE
    `);
  }

  beforeEach(async () => {
    await limparBanco();

    await db.insert(usuarios).values([
      {
        id: ids.leiloeiro,
        nome: "Leiloeiro Teste",
        apelido: "leiloeiro",
        email: "leiloeiro@teste.com",
        senhaHash: "hash-de-teste",
        papelUsuario: "LEILOEIRO",
      },
      {
        id: ids.licitante,
        nome: "Licitante Teste",
        apelido: "licitante",
        email: "licitante@teste.com",
        senhaHash: "hash-de-teste",
        papelUsuario: "LICITANTE",
      },
    ]);

    await db.insert(itens).values({
      id: ids.item,
      titulo: "Notebook",
      descricao: "Item demonstrativo",
      imagem: "/images/notebook.jpg",
    });

    await db.insert(lotes).values({
      id: ids.lote,
      leiloeiroId: ids.leiloeiro,
      itemId: ids.item,
      lanceInicial: 100000,
      incrementoMinimo: 1000,
      horarioInicio: new Date(Date.now() - 600000),
      horarioFim: new Date(Date.now() - 60000),
    });
  });

  afterEach(limparBanco);

  afterAll(async () => {
    await pool.end();
  });

  it("deve encerrar um lote sem lances", async () => {
    const resultado = await encerrarLote(ids.lote);

    expect(resultado.situacao).toBe("SEM_LANCES");
    expect(resultado.lanceVencedorId).toBeNull();
    expect(resultado.processadoAgora).toBe(true);

    const [registro] = await db
      .select()
      .from(lotes)
      .where(eq(lotes.id, ids.lote));

    expect(registro.encerradoEm).not.toBeNull();
  });

  it("deve identificar o lance vencedor", async () => {
    const lanceId = randomUUID();

    await db.insert(lances).values({
      id: lanceId,
      loteId: ids.lote,
      licitanteId: ids.licitante,
      valorMonetario: 100000,
      sequencia: 1,
      realizadoEm: new Date(Date.now() - 120000),
    });

    const resultado = await encerrarLote(ids.lote);

    expect(resultado.situacao).toBe("AGUARDANDO_LIQUIDACAO");
    expect(resultado.lanceVencedorId).toBe(lanceId);
  });

  it("não deve processar o encerramento duas vezes", async () => {
    const primeiro = await encerrarLote(ids.lote);
    const segundo = await encerrarLote(ids.lote);

    expect(primeiro.processadoAgora).toBe(true);
    expect(segundo.processadoAgora).toBe(false);
  });

  it("não deve encerrar um lote ainda em andamento", async () => {
    await db
      .update(lotes)
      .set({ horarioFim: new Date(Date.now() + 60000) })
      .where(eq(lotes.id, ids.lote));

    await expect(encerrarLote(ids.lote)).rejects.toThrow(
      "O lote ainda não atingiu o encerramento."
    );
  });
});
