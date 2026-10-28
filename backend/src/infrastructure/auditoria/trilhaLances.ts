import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, open, readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

export type DadosLanceAuditoria = {
  id: string;
  loteId: string;
  licitanteId: string;
  valorMonetario: number;
  realizadoEm: string;
  sequencia: number;
};

export type SituacaoAuditoria =
  | "INTEGRO"
  | "INCONSISTENTE"
  | "NAO_VERIFICAVEL";

type RegistroAssinado = {
  dados: DadosLanceAuditoria;
  anterior: string;
  assinatura: string;
};

type ResultadoVerificacao = {
  situacao: SituacaoAuditoria;
  historicoAssinado: DadosLanceAuditoria[];
};

const GENESIS = "0".repeat(64);

function obterConfiguracao() {
  const diretorio = process.env.AUDITORIA_DIRETORIO;
  const chaveHex = process.env.AUDITORIA_CHAVE_HEX;

  if (!diretorio || !isAbsolute(diretorio)) {
    throw new Error("AUDITORIA_DIRETORIO inválido.");
  }

  if (!chaveHex || !/^[0-9a-fA-F]{64}$/.test(chaveHex)) {
    throw new Error("AUDITORIA_CHAVE_HEX inválida.");
  }

  return {
    diretorio,
    chave: Buffer.from(chaveHex, "hex"),
  };
}

function caminhoTrilha(loteId: string): string {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuid.test(loteId)) {
    throw new Error("Identificador de lote inválido.");
  }

  return join(
    obterConfiguracao().diretorio,
    `${loteId}.jsonl`
  );
}

function serializar(
  dados: DadosLanceAuditoria,
  anterior: string
): string {
  return JSON.stringify([
    "v1",
    dados.loteId,
    dados.sequencia,
    dados.id,
    dados.licitanteId,
    dados.valorMonetario,
    dados.realizadoEm,
    anterior,
  ]);
}

function assinar(
  dados: DadosLanceAuditoria,
  anterior: string
): string {
  return createHmac("sha256", obterConfiguracao().chave)
    .update(serializar(dados, anterior))
    .digest("hex");
}

async function lerTrilha(
  loteId: string
): Promise<RegistroAssinado[] | null> {
  let conteudo: string;

  try {
    conteudo = await readFile(caminhoTrilha(loteId), "utf8");
  } catch (erro) {
    if (
      erro instanceof Error &&
      "code" in erro &&
      erro.code === "ENOENT"
    ) {
      return null;
    }

    throw erro;
  }

  if (!conteudo.trim()) {
    return [];
  }

  return conteudo
    .trim()
    .split("\n")
    .map((linha) => JSON.parse(linha) as RegistroAssinado);
}

function validarCadeia(
  loteId: string,
  registros: RegistroAssinado[]
): boolean {
  let anterior = GENESIS;

  for (let indice = 0; indice < registros.length; indice++) {
    const registro = registros[indice];

    if (
      registro?.dados?.loteId !== loteId ||
      registro.dados.sequencia !== indice + 1 ||
      registro.anterior !== anterior ||
      typeof registro.assinatura !== "string" ||
      !/^[0-9a-f]{64}$/.test(registro.assinatura)
    ) {
      return false;
    }

    const assinaturaEsperada = assinar(
      registro.dados,
      anterior
    );

    const recebida = Buffer.from(registro.assinatura, "hex");
    const esperada = Buffer.from(assinaturaEsperada, "hex");

    if (!timingSafeEqual(recebida, esperada)) {
      return false;
    }

    anterior = registro.assinatura;
  }

  return true;
}

export async function registrarLanceNaTrilha(
  dados: DadosLanceAuditoria
): Promise<void> {
  const registros = await lerTrilha(dados.loteId);

  if (registros !== null) {
    if (
      registros.length === 0 ||
      !validarCadeia(dados.loteId, registros)
    ) {
      throw new Error("Trilha de auditoria inconsistente.");
    }
  }

  const quantidade = registros?.length ?? 0;

  if (dados.sequencia !== quantidade + 1) {
    throw new Error("Sequência da trilha inconsistente.");
  }

  const anterior = registros?.at(-1)?.assinatura ?? GENESIS;

  const registro: RegistroAssinado = {
    dados,
    anterior,
    assinatura: assinar(dados, anterior),
  };

  await mkdir(obterConfiguracao().diretorio, {
    recursive: true,
    mode: 0o700,
  });

  const arquivo = await open(
    caminhoTrilha(dados.loteId),
    registros === null ? "ax" : "a",
    0o600
  );

  try {
    await arquivo.writeFile(`${JSON.stringify(registro)}\n`);
    await arquivo.sync();
  } finally {
    await arquivo.close();
  }
}

export async function verificarTrilhaLances(
  loteId: string,
  historicoBanco: DadosLanceAuditoria[]
): Promise<ResultadoVerificacao> {
  try {
    const registros = await lerTrilha(loteId);

    if (
      registros === null ||
      registros.length === 0 ||
      !validarCadeia(loteId, registros)
    ) {
      return {
        situacao: "NAO_VERIFICAVEL",
        historicoAssinado: [],
      };
    }

    const historicoAssinado = registros.map(
      (registro) => registro.dados
    );

    const corresponde =
      historicoAssinado.length === historicoBanco.length &&
      historicoAssinado.every((assinado, indice) => {
        const banco = historicoBanco[indice];

        return (
          serializar(assinado, GENESIS) ===
          serializar(banco, GENESIS)
        );
      });

    return {
      situacao: corresponde ? "INTEGRO" : "INCONSISTENTE",
      historicoAssinado,
    };
  } catch {
    return {
      situacao: "NAO_VERIFICAVEL",
      historicoAssinado: [],
    };
  }
}
