import "dotenv/config";
import { hash } from "bcryptjs";
import { and, eq, gt, isNull, lte } from "drizzle-orm";

import { db, pool } from "./conexao.js";
import {
  usuarios,
  carteiras,
  itens,
  lotes,
} from "./schema.js";

const ids = {
  leiloeiro: "00000000-0000-4000-8000-000000000001",
  licitante1: "00000000-0000-4000-8000-000000000002",
  licitante2: "00000000-0000-4000-8000-000000000003"
};

async function executarSeed(): Promise<void> {
  const senha = process.env.DEMO_PASSWORD;

  if (!senha) {
    throw new Error("DEMO_PASSWORD não configurada.");
  }

  const senhaHash = await hash(senha, 12);

  await db.transaction(async (tx) => {
    await tx.insert(usuarios).values([
      {
        id: ids.leiloeiro,
        nome: "Guilherme Almeida",
        apelido: "Guilherminho",
        email: "guilhermealmeida@demo.com",
        senhaHash,
        papelUsuario: "LEILOEIRO",
      },
      {
        id: ids.licitante1,
        nome: "Ana Souza",
        apelido: "Aninha",
        email: "anasouza@demo.com",
        senhaHash,
        papelUsuario: "LICITANTE",
      },
      {
        id: ids.licitante2,
        nome: "Bruno Lima",
        apelido: "Bruninho",
        email: "brunolima@demo.com",
        senhaHash,
        papelUsuario: "LICITANTE",
      },
    ]).onConflictDoNothing();

    await tx.insert(carteiras).values([
      {
        usuarioId: ids.leiloeiro,
        saldoTotal: 0,
      },
      {
        usuarioId: ids.licitante1,
        saldoTotal: 500000,
      },
      {
        usuarioId: ids.licitante2,
        saldoTotal: 500000,
      },
    ]).onConflictDoNothing();

    // Cria apenas quando não há nenhum lote efetivamente aberto.
    // O produto é uma cópia local, sem dependência da DummyJSON no seed.
    const agora = new Date();
    const [loteAberto] = await tx
      .select({ id: lotes.id })
      .from(lotes)
      .where(and(
        eq(lotes.leiloeiroId, ids.leiloeiro),
        isNull(lotes.canceladoEm),
        lte(lotes.horarioInicio, agora),
        gt(lotes.horarioFim, agora),
      ))
      .limit(1);

    if (!loteAberto) {
      const [produto] = await tx.insert(itens).values({
        titulo: "Essence Mascara Lash Princess",
        descricao: "Máscara de cílios utilizada como produto demonstrativo do leilão.",
        imagem: "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp",
      }).returning({ id: itens.id });

      await tx.insert(lotes).values({
        leiloeiroId: ids.leiloeiro,
        itemId: produto.id,
        lanceInicial: 100000,
        incrementoMinimo: 1000,
        horarioInicio: new Date(agora.getTime() - 60_000),
        horarioFim: new Date(agora.getTime() + 48 * 60 * 60 * 1000),
      });
    }
  });

  console.log("Seed executado com sucesso. Há pelo menos um lote demonstrativo aberto.");
}

try {
  await executarSeed();
} catch (erro) {
  console.error("Erro ao executar seed:", erro);
  process.exitCode = 1;
} finally {
  await pool.end();
}
