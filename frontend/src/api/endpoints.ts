import { requisitar } from "./cliente.js";
import type {
  Auditoria,
  Carteira,
  Comprovante,
  LoteDetalhe,
  LoteResumo,
  MinhaSituacao,
  Participacao,
  Produto,
  ResultadoLeiloeiro,
  Sessao,
} from "../types";

export const api = {
  entrar: (email: string, senha: string) =>
    requisitar<Sessao>("/auth/login", undefined, {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    }),
  lotes: () => requisitar<LoteResumo[]>("/lotes"),
  lote: (id: string) => requisitar<LoteDetalhe>(`/lotes/${id}`),
  minhaSituacao: (id: string, token: string) =>
    requisitar<MinhaSituacao>(`/lotes/${id}/minha-situacao`, token),
  darLance: (id: string, valorMonetario: number, token: string) =>
    requisitar<{ id: string }>(`/lotes/${id}/lances`, token, {
      method: "POST",
      body: JSON.stringify({ valorMonetario }),
    }),
  auditoria: (id: string) => requisitar<Auditoria>(`/lotes/${id}/auditoria`),
  comprovante: (id: string) =>
    requisitar<Comprovante>(`/lotes/${id}/comprovante`),
  carteira: (token: string) => requisitar<Carteira>("/carteira", token),
  depositar: (token: string, valorMonetario: number) =>
    requisitar<Carteira>("/carteira/depositos", token, {
      method: "POST",
      body: JSON.stringify({ valorMonetario }),
    }),
  participacoes: (token: string) =>
    requisitar<Participacao[]>("/licitante/participacoes", token),
  meusLotes: (token: string) =>
    requisitar<ResultadoLeiloeiro>("/leiloeiro/lotes", token),
  cancelarLote: (id: string, token: string) =>
    requisitar<{ id: string }>(`/lotes/${id}`, token, { method: "DELETE" }),
  produtos: (token: string) => requisitar<Produto[]>("/produtos", token),
  criarLote: (
    token: string,
    dados: {
      produtoId: number;
      lanceInicial: number;
      incrementoMinimo: number;
      horarioInicio: string;
      horarioFim: string;
    }
  ) =>
    requisitar<{ id: string }>("/lotes", token, {
      method: "POST",
      body: JSON.stringify(dados),
    }),
};
