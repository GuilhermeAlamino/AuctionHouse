
import "dotenv/config";
import jwt from "jsonwebtoken";

export type Papel = "LEILOEIRO" | "LICITANTE";

export type Sessao = {
  usuarioId: string;
  papel: Papel;
};

function obterChave(): string {
  const chave = process.env.JWT_SECRET;

  if (!chave || chave.length < 32) {
    throw new Error("JWT_SECRET não configurada.");
  }

  return chave;
}

export function gerarToken(sessao: Sessao): string {
  return jwt.sign(
    { papel: sessao.papel },
    obterChave(),
    {
      subject: sessao.usuarioId,
      algorithm: "HS256",
      expiresIn: "8h",
    }
  );
}

export function verificarToken(token: string): Sessao {
  const dados = jwt.verify(token, obterChave(), {
    algorithms: ["HS256"],
  });

  if (
    typeof dados === "string" ||
    typeof dados.sub !== "string" ||
    (dados.papel !== "LEILOEIRO" &&
      dados.papel !== "LICITANTE")
  ) {
    throw new Error("Token inválido.");
  }

  return {
    usuarioId: dados.sub,
    papel: dados.papel,
  };
}
