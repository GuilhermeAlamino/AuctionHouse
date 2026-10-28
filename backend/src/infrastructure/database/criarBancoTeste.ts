
import { Client } from "pg";

async function criarBancoTeste(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não configurada.");
  }

  const url = new URL(databaseUrl);
  const nomeBanco = url.pathname.slice(1);

  if (nomeBanco !== "casa_leiloes_test") {
    throw new Error("Banco de testes inválido.");
  }

  // Conecta ao banco administrativo para criar o banco de testes.
  url.pathname = "/postgres";

  const client = new Client({
    connectionString: url.toString(),
  });

  try {
    await client.connect();

    const resultado = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [nomeBanco]
    );

    if (resultado.rowCount === 0) {
      await client.query(
        'CREATE DATABASE "casa_leiloes_test"'
      );

      console.log("Banco de testes criado.");
    } else {
      console.log("Banco de testes já existe.");
    }
  } finally {
    await client.end();
  }
}

criarBancoTeste().catch((erro: unknown) => {
  console.error("Erro ao preparar banco de testes:", erro);
  process.exitCode = 1;
});
