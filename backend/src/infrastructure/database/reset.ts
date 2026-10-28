import "dotenv/config";

import { rename } from "node:fs/promises";
import { basename, isAbsolute } from "node:path";
import { Pool } from "pg";

async function resetarBanco(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const diretorioAuditoria = process.env.AUDITORIA_DIRETORIO;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não configurada.");
  }

  const url = new URL(databaseUrl);
  const nomeBanco = decodeURIComponent(url.pathname.slice(1));

  if (
    process.env.NODE_ENV === "production" ||
    nomeBanco !== "casa_leiloes" ||
    !["localhost", "127.0.0.1"].includes(url.hostname)
  ) {
    throw new Error(
      "Reset permitido somente no banco local casa_leiloes."
    );
  }

  if (
    !diretorioAuditoria ||
    !isAbsolute(diretorioAuditoria) ||
    basename(diretorioAuditoria) !== "auditoria"
  ) {
    throw new Error(
      "AUDITORIA_DIRETORIO deve ser um caminho absoluto terminado em auditoria."
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    await pool.query(`
      TRUNCATE TABLE
        comprovantes,
        lances,
        lotes,
        itens,
        carteiras,
        usuarios
      RESTART IDENTITY CASCADE
    `);

    console.log("Banco de desenvolvimento limpo.");
  } finally {
    await pool.end();
  }

  const backup = `${diretorioAuditoria}-backup-${Date.now()}`;

  try {
    await rename(diretorioAuditoria, backup);
    console.log(`Auditoria anterior arquivada em: ${backup}`);
  } catch (erro) {
    if (
      !(
        erro instanceof Error &&
        "code" in erro &&
        erro.code === "ENOENT"
      )
    ) {
      throw erro;
    }
  }
}

try {
  await resetarBanco();
} catch (erro) {
  console.error("Erro ao resetar o banco:", erro);
  process.exitCode = 1;
}
