import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
  describe,
  expect,
  it,
} from "vitest";

import { realizarLance } from "../../backend/src/application/use-cases/realizarLance.js";
import { db, pool } from "../../backend/src/infrastructure/database/conexao.js";
import {
  usuarios,
  itens,
  lotes,
  lances,
  carteiras,
} from "../../backend/src/infrastructure/database/schema.js";
import { rm } from "node:fs/promises";
import { basename, isAbsolute, join } from "node:path";
import { verificarIntegridadeLances } from "../../backend/src/application/use-cases/verificarIntegridadeLances.js";

describe("RealizarLance - Integração", () => {
  const ids = {
    leiloeiro: randomUUID(),
    licitante1: randomUUID(),
    licitante2: randomUUID(),
    item: randomUUID(),
    lote: randomUUID(),
  };

  async function verificarBancoTeste(): Promise<void> {
    const url = process.env.DATABASE_URL;

    if (!url || new URL(url).pathname !== "/casa_leiloes_test") {
      throw new Error("Conexão não aponta para o banco de testes.");
    }

    const resultado = await pool.query("SELECT current_database() AS nome");

    if (resultado.rows[0]?.nome !== "casa_leiloes_test") {
      throw new Error("Banco de testes inválido.");
    }
  }

  async function limparBanco(): Promise<void> {
    await verificarBancoTeste();

    const diretorio = process.env.AUDITORIA_DIRETORIO;

    if (
      !diretorio ||
      !isAbsolute(diretorio) ||
      basename(diretorio) !== "auditoria-test"
    ) {
      throw new Error("Diretório de auditoria de testes inválido.");
    }

    await rm(join(diretorio, `${ids.lote}.jsonl`), {
      force: true,
    });

    await pool.query(`
      TRUNCATE TABLE
        comprovantes, lances, lotes,
        carteiras, itens, usuarios
      RESTART IDENTITY CASCADE
    `);
  }

  beforeAll(async () => {
    await verificarBancoTeste();
  });

  beforeEach(async () => {
    await limparBanco();

    const senhaHash = await hash("SenhaTeste123!", 4);

    await db.insert(usuarios).values([
      {
        id: ids.leiloeiro,
        nome: "Leiloeiro Teste",
        apelido: "leiloeiro",
        email: "leiloeiro@teste.com",
        senhaHash,
        papelUsuario: "LEILOEIRO",
      },
      {
        id: ids.licitante1,
        nome: "Licitante Um",
        apelido: "licitante1",
        email: "licitante1@teste.com",
        senhaHash,
        papelUsuario: "LICITANTE",
      },
      {
        id: ids.licitante2,
        nome: "Licitante Dois",
        apelido: "licitante2",
        email: "licitante2@teste.com",
        senhaHash,
        papelUsuario: "LICITANTE",
      },
    ]);

    await db.insert(carteiras).values([
      { usuarioId: ids.leiloeiro, saldoTotal: 0 },
      { usuarioId: ids.licitante1, saldoTotal: 500000 },
      { usuarioId: ids.licitante2, saldoTotal: 500000 },
    ]);

    await db.insert(itens).values({
      id: ids.item,
      titulo: "Notebook Teste",
      descricao: "Produto utilizado nos testes.",
      imagem: "/images/notebook.jpg",
    });

    await db.insert(lotes).values({
      id: ids.lote,
      leiloeiroId: ids.leiloeiro,
      itemId: ids.item,
      lanceInicial: 100000,
      incrementoMinimo: 1000,
      horarioInicio: new Date(Date.now() - 60_000),
      horarioFim: new Date(Date.now() + 3_600_000),
    });
  });

  afterEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("deve registrar lances e liberar o saldo do líder anterior", async () => {
    await realizarLance({
      loteId: ids.lote,
      licitanteId: ids.licitante1,
      valorMonetario: 100000,
    });

    await realizarLance({
      loteId: ids.lote,
      licitanteId: ids.licitante2,
      valorMonetario: 101000,
    });

    const historico = await db.select().from(lances).orderBy(lances.sequencia);

    const [carteira1] = await db
      .select()
      .from(carteiras)
      .where(eq(carteiras.usuarioId, ids.licitante1));

    const [carteira2] = await db
      .select()
      .from(carteiras)
      .where(eq(carteiras.usuarioId, ids.licitante2));

    expect(historico).toHaveLength(2);
    expect(historico[0].sequencia).toBe(1);
    expect(historico[1].sequencia).toBe(2);

    expect(carteira1.saldoComprometido).toBe(0);
    expect(carteira2.saldoComprometido).toBe(101000);
    expect(carteira2.saldoTotal).toBe(500000);
  });

  it("deve recusar lance abaixo do incremento mínimo", async () => {
    await realizarLance({
      loteId: ids.lote,
      licitanteId: ids.licitante1,
      valorMonetario: 100000,
    });

    await expect(
      realizarLance({
        loteId: ids.lote,
        licitanteId: ids.licitante2,
        valorMonetario: 100500,
      })
    ).rejects.toThrow("O lance está abaixo do valor mínimo permitido.");

    const historico = await db.select().from(lances);

    expect(historico).toHaveLength(1);
  });

  it("não deve permitir que o líder realize outro lance", async () => {
    await realizarLance({
      loteId: ids.lote,
      licitanteId: ids.licitante1,
      valorMonetario: 100000,
    });

    await expect(
      realizarLance({
        loteId: ids.lote,
        licitanteId: ids.licitante1,
        valorMonetario: 101000,
      })
    ).rejects.toThrow("Você já está liderando este lote.");

    const historico = await db.select().from(lances);

    expect(historico).toHaveLength(1);
  });

  it("não deve permitir lance com saldo insuficiente", async () => {
    await expect(
      realizarLance({
        loteId: ids.lote,
        licitanteId: ids.licitante1,
        valorMonetario: 500001,
      })
    ).rejects.toThrow("Saldo disponível insuficiente.");

    const [carteira] = await db
      .select()
      .from(carteiras)
      .where(eq(carteiras.usuarioId, ids.licitante1));

    expect(carteira.saldoTotal).toBe(500000);
    expect(carteira.saldoComprometido).toBe(0);

    const historico = await db.select().from(lances);

    expect(historico).toHaveLength(0);
  });

  it("não deve permitir lances em um lote encerrado", async () => {
    await db
      .update(lotes)
      .set({
        horarioFim: new Date(Date.now() - 1000),
      })
      .where(eq(lotes.id, ids.lote));

    await expect(
      realizarLance({
        loteId: ids.lote,
        licitanteId: ids.licitante1,
        valorMonetario: 100000,
      })
    ).rejects.toThrow("O lote não está em andamento.");

    const historico = await db.select().from(lances);

    expect(historico).toHaveLength(0);
  });

  it("deve preservar a consistência em lances simultâneos", async () => {
    const resultados = await Promise.allSettled([
      realizarLance({
        loteId: ids.lote,
        licitanteId: ids.licitante1,
        valorMonetario: 100000,
      }),
      realizarLance({
        loteId: ids.lote,
        licitanteId: ids.licitante2,
        valorMonetario: 100000,
      }),
    ]);

    expect(
      resultados.filter((resultado) => resultado.status === "fulfilled")
    ).toHaveLength(1);

    expect(
      resultados.filter((resultado) => resultado.status === "rejected")
    ).toHaveLength(1);

    const historico = await db.select().from(lances);

    expect(historico).toHaveLength(1);
    expect(historico[0].sequencia).toBe(1);

    const saldos = await db.select().from(carteiras);

    const totalComprometido = saldos.reduce(
      (total, carteira) => total + carteira.saldoComprometido,
      0
    );

    expect(totalComprometido).toBe(100000);
  });

  it("deve validar um histórico legítimo", async () => {
    await realizarLance({
      loteId: ids.lote,
      licitanteId: ids.licitante1,
      valorMonetario: 100000,
    });

    const resultado = await verificarIntegridadeLances(ids.lote);

    expect(resultado.situacao).toBe("INTEGRO");
    expect(resultado.historico).toHaveLength(1);
  });

  it("deve detectar alteração direta de um lance", async () => {
    await realizarLance({
      loteId: ids.lote,
      licitanteId: ids.licitante1,
      valorMonetario: 100000,
    });

    await db
      .update(lances)
      .set({ valorMonetario: 200000 })
      .where(eq(lances.loteId, ids.lote));

    const resultado = await verificarIntegridadeLances(ids.lote);

    expect(resultado.situacao).toBe("INCONSISTENTE");
  });

  it("deve detectar exclusão do último lance", async () => {
    await realizarLance({
      loteId: ids.lote,
      licitanteId: ids.licitante1,
      valorMonetario: 100000,
    });

    await realizarLance({
      loteId: ids.lote,
      licitanteId: ids.licitante2,
      valorMonetario: 101000,
    });

    await db.delete(lances).where(eq(lances.licitanteId, ids.licitante2));

    const resultado = await verificarIntegridadeLances(ids.lote);

    expect(resultado.situacao).toBe("INCONSISTENTE");
    expect(resultado.historico).toHaveLength(2);
  });

  it("deve detectar inserção direta de um lance", async () => {
    await realizarLance({
      loteId: ids.lote,
      licitanteId: ids.licitante1,
      valorMonetario: 100000,
    });

    await db.insert(lances).values({
      id: randomUUID(),
      loteId: ids.lote,
      licitanteId: ids.licitante2,
      valorMonetario: 101000,
      sequencia: 2,
      realizadoEm: new Date(),
    });

    const resultado = await verificarIntegridadeLances(ids.lote);

    expect(resultado.situacao).toBe("INCONSISTENTE");
  });

  it("não deve declarar íntegro sem a trilha", async () => {
    const resultado = await verificarIntegridadeLances(ids.lote);

    expect(resultado.situacao).toBe("NAO_VERIFICAVEL");
  });
});
