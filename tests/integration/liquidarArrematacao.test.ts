import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { liquidarArrematacao } from "../../backend/src/application/use-cases/liquidarArrematacao.js";
import { db, pool } from "../../backend/src/infrastructure/database/conexao.js";
import {
  usuarios,
  itens,
  lotes,
  lances,
  carteiras,
  comprovantes,
} from "../../backend/src/infrastructure/database/schema.js";
import { processarLotesVencidos } from "../../backend/src/application/use-cases/processarLotesVencidos.js";

describe("LiquidarArrematacao - Integração", () => {
  const ids = {
    leiloeiro: randomUUID(),
    vencedor: randomUUID(),
    item: randomUUID(),
    lote: randomUUID(),
    lance: randomUUID(),
  };

  async function verificarBancoTeste(): Promise<void> {
    const url = process.env.DATABASE_URL;

    if (!url || new URL(url).pathname !== "/casa_leiloes_test") {
      throw new Error("Banco de testes não configurado.");
    }

    const resultado = await pool.query("SELECT current_database() AS nome");

    if (resultado.rows[0]?.nome !== "casa_leiloes_test") {
      throw new Error("Banco de testes inválido.");
    }
  }

  async function limparBanco(): Promise<void> {
    await verificarBancoTeste();

    await pool.query(`
      TRUNCATE TABLE
        comprovantes, lances, lotes,
        carteiras, itens, usuarios
      RESTART IDENTITY CASCADE
    `);
  }

  beforeAll(verificarBancoTeste);

  beforeEach(async () => {
    await limparBanco();

    const agora = Date.now();

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
        id: ids.vencedor,
        nome: "Licitante Teste",
        apelido: "licitante",
        email: "licitante@teste.com",
        senhaHash: "hash-de-teste",
        papelUsuario: "LICITANTE",
      },
    ]);

    await db.insert(carteiras).values([
      {
        usuarioId: ids.leiloeiro,
        saldoTotal: 0,
        saldoComprometido: 0,
      },
      {
        usuarioId: ids.vencedor,
        saldoTotal: 500000,
        saldoComprometido: 100000,
      },
    ]);

    await db.insert(itens).values({
      id: ids.item,
      titulo: "Notebook",
      descricao: "Item de teste",
      imagem: "/images/notebook.jpg",
    });

    await db.insert(lotes).values({
      id: ids.lote,
      leiloeiroId: ids.leiloeiro,
      itemId: ids.item,
      lanceInicial: 100000,
      incrementoMinimo: 1000,
      horarioInicio: new Date(agora - 3600000),
      horarioFim: new Date(agora - 120000),
      encerradoEm: new Date(agora - 60000),
    });

    await db.insert(lances).values({
      id: ids.lance,
      loteId: ids.lote,
      licitanteId: ids.vencedor,
      valorMonetario: 100000,
      sequencia: 1,
      realizadoEm: new Date(agora - 180000),
    });
  });

  afterEach(limparBanco);

  afterAll(async () => {
    await pool.end();
  });

  it("deve transferir o valor e gerar um comprovante", async () => {
    const resultado = await liquidarArrematacao(ids.lote);

    const [vencedor] = await db
      .select()
      .from(carteiras)
      .where(eq(carteiras.usuarioId, ids.vencedor));

    const [leiloeiro] = await db
      .select()
      .from(carteiras)
      .where(eq(carteiras.usuarioId, ids.leiloeiro));

    const registros = await db.select().from(comprovantes);

    expect(vencedor.saldoTotal).toBe(400000);
    expect(vencedor.saldoComprometido).toBe(0);
    expect(leiloeiro.saldoTotal).toBe(100000);

    expect(registros).toHaveLength(1);
    expect(resultado.obterLanceVencedorId()).toBe(ids.lance);
  });

  it("não deve liquidar duas vezes a mesma arrematação", async () => {
    const primeiro = await liquidarArrematacao(ids.lote);
    const segundo = await liquidarArrematacao(ids.lote);

    const [leiloeiro] = await db
      .select()
      .from(carteiras)
      .where(eq(carteiras.usuarioId, ids.leiloeiro));

    const registros = await db.select().from(comprovantes);

    expect(primeiro.obterId()).toBe(segundo.obterId());
    expect(leiloeiro.saldoTotal).toBe(100000);
    expect(registros).toHaveLength(1);
  });

  it("não deve liquidar antes do processamento do encerramento", async () => {
    await db
      .update(lotes)
      .set({ encerradoEm: null })
      .where(eq(lotes.id, ids.lote));

    await expect(liquidarArrematacao(ids.lote)).rejects.toThrow(
      "O lote ainda não foi encerrado."
    );
  });

  it("não deve liquidar um lote sem vencedor", async () => {
    await db.delete(lances).where(eq(lances.loteId, ids.lote));

    await expect(liquidarArrematacao(ids.lote)).rejects.toThrow(
      "O lote não possui lance vencedor."
    );
  });

  it("deve preservar os saldos quando a liquidação falhar", async () => {
    await db
      .update(carteiras)
      .set({ saldoComprometido: 50000 })
      .where(eq(carteiras.usuarioId, ids.vencedor));

    await expect(liquidarArrematacao(ids.lote)).rejects.toThrow(
      "O débito deve utilizar saldo previamente comprometido."
    );

    const [vencedor] = await db
      .select()
      .from(carteiras)
      .where(eq(carteiras.usuarioId, ids.vencedor));

    const [leiloeiro] = await db
      .select()
      .from(carteiras)
      .where(eq(carteiras.usuarioId, ids.leiloeiro));

    const registros = await db.select().from(comprovantes);

    expect(vencedor.saldoTotal).toBe(500000);
    expect(vencedor.saldoComprometido).toBe(50000);
    expect(leiloeiro.saldoTotal).toBe(0);
    expect(registros).toHaveLength(0);
  });

  it("deve encerrar e liquidar automaticamente um lote vencido", async () => {
    await db
      .update(lotes)
      .set({ encerradoEm: null })
      .where(eq(lotes.id, ids.lote));

    const resultado = await processarLotesVencidos();

    expect(resultado.encerrados).toBe(1);
    expect(resultado.liquidados).toBe(1);
    expect(resultado.falhas).toHaveLength(0);

    const [lote] = await db.select().from(lotes).where(eq(lotes.id, ids.lote));

    const [vencedor] = await db
      .select()
      .from(carteiras)
      .where(eq(carteiras.usuarioId, ids.vencedor));

    const [leiloeiro] = await db
      .select()
      .from(carteiras)
      .where(eq(carteiras.usuarioId, ids.leiloeiro));

    const registros = await db.select().from(comprovantes);

    expect(lote.encerradoEm).not.toBeNull();
    expect(vencedor.saldoTotal).toBe(400000);
    expect(vencedor.saldoComprometido).toBe(0);
    expect(leiloeiro.saldoTotal).toBe(100000);
    expect(registros).toHaveLength(1);

    // Uma segunda execução não pode liquidar novamente.
    const segundaExecucao = await processarLotesVencidos();

    expect(segundaExecucao.encerrados).toBe(0);
    expect(segundaExecucao.liquidados).toBe(0);
  });
});
