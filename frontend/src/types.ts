export type SituacaoLote = "AGENDADO" | "EM_ANDAMENTO" | "ENCERRADO" | "CANCELADO";
export type PapelUsuario = "LEILOEIRO" | "LICITANTE";

export type ItemLote = { id: string; titulo: string; descricao: string; imagem: string };
export type LoteResumo = {
  id: string;
  item: ItemLote;
  lanceInicial: number;
  incrementoMinimo: number;
  horarioInicio: string;
  horarioFim: string;
  situacao: SituacaoLote;
  lanceAtual: number | null;
  valorAtual: number;
};
export type LancePublico = {
  sequencia: number;
  licitante: string;
  valorMonetario: number;
  realizadoEm: string;
};
export type LoteDetalhe = LoteResumo & {
  proximoLanceMinimo: number | null;
  quantidadeLances: number;
  lider: LancePublico | null;
  historico: LancePublico[];
};
export type Usuario = { id: string; nome: string; apelido: string; papel: PapelUsuario };
export type Sessao = { token: string; usuario: Usuario };
export type MinhaSituacao = {
  loteId: string;
  situacao: SituacaoLote;
  participando: boolean;
  liderando: boolean;
  meuUltimoLance: number | null;
  arrematado: boolean;
  liquidado: boolean;
  comprovanteId: string | null;
};
export type Carteira = { saldoTotal: number; saldoComprometido: number; saldoDisponivel: number };
export type Participacao = {
  loteId: string;
  titulo: string;
  imagem: string;
  situacao: SituacaoLote;
  meuMaiorLance: number;
  lanceAtual: number | null;
  valorVencedor: number | null;
  liderando: boolean;
  arrematado: boolean;
  liquidado: boolean;
  comprovanteId: string | null;
};
export type LoteLeiloeiro = {
  loteId: string;
  titulo: string;
  imagem: string;
  situacao: SituacaoLote;
  horarioInicio: string;
  horarioFim: string;
  quantidadeLances: number;
  lanceAtual: number | null;
  valorArrematacao: number | null;
  valorRecebido: number;
  arrematado: boolean;
  liquidado: boolean;
  comprovanteId: string | null;
};
export type ResultadoLeiloeiro = {
  totalRecebido: number;
  quantidadeLotes: number;
  lotes: LoteLeiloeiro[];
};
export type Produto = { id: number; titulo: string; descricao: string; imagem: string };
export type Auditoria = {
  loteId: string;
  situacao: "INTEGRO" | "INCONSISTENTE" | "NAO_VERIFICAVEL";
  fonteHistorico: "TRILHA_ASSINADA" | "BANCO_NAO_VERIFICADO";
  quantidadeLances: number;
  historico: LancePublico[];
};
export type Comprovante = {
  id: string;
  loteId: string;
  item: { titulo: string; imagem: string };
  valorArrematacao: number;
  lanceRealizadoEm: string;
  encerradoEm: string | null;
  vencedor: string;
};
