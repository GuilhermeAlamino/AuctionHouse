import type { Sessao } from "../types.js";

const CHAVE_SESSAO = "AuctionHouse:Sessao";

export function obterSessao(): Sessao | null {
  try {
    const salvo = sessionStorage.getItem(CHAVE_SESSAO);
    return salvo ? (JSON.parse(salvo) as Sessao) : null;
  } catch {
    return null;
  }
}

export function guardarSessao(sessao: Sessao | null) {
  if (sessao) sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
  else sessionStorage.removeItem(CHAVE_SESSAO);
}

export async function requisitar<T>(caminho: string, token?: string, options: RequestInit = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor.");
  }

  const dados: unknown = await resposta.json().catch(() => null);

  // Quando o Vite não encontra a API, o proxy pode responder sem JSON.
  if (!resposta.ok && resposta.status >= 500 && dados === null) {
    throw new Error("API indisponível. Confira se o backend está em execução.");
  }

  if (!resposta.ok) {
    const mensagem = dados && typeof dados === "object" && "erro" in dados && typeof dados.erro === "string"
      ? dados.erro
      : `Erro na solicitação (${resposta.status}).`;
    throw new Error(mensagem);
  }
  return dados as T;
}
