import { Item } from "./item.js";
import { SituacaoLote } from "../enums/situacaoLote.js";
import { Lance } from "./lance.js";

type DadosLote = {
  id: string;
  leiloeiroId: string;
  item: Item;
  lanceInicial: number;
  incrementoMinimo: number;
  horarioInicio: Date;
  horarioFim: Date;
  canceladoEm: Date | null;
  prorrogado: boolean;
  encerradoEm?: Date | null;
};

export class Lote {
  private readonly id: string;
  private readonly leiloeiroId: string;
  private readonly item: Item;
  private readonly lanceInicial: number;
  private readonly incrementoMinimo: number;
  private readonly horarioInicio: Date;

  private horarioFim: Date;
  private canceladoEm: Date | null = null;
  private prorrogado = false;
  private encerradoEm: Date | null;

  constructor(dados: DadosLote) {
    this.id = dados.id.trim();
    this.leiloeiroId = dados.leiloeiroId.trim();
    this.item = dados.item;
    this.lanceInicial = dados.lanceInicial;
    this.incrementoMinimo = dados.incrementoMinimo;
    this.horarioInicio = new Date(dados.horarioInicio);
    this.horarioFim = new Date(dados.horarioFim);
    this.canceladoEm = dados.canceladoEm ? new Date(dados.canceladoEm) : null;
    this.prorrogado = dados.prorrogado ? true : false;
    this.encerradoEm = dados.encerradoEm ? new Date(dados.encerradoEm) : null;

    this.validar();
  }

  private validar(): void {
    if (!this.id) {
      throw new Error("O identificador do lote é obrigatório.");
    }

    if (!this.leiloeiroId) {
      throw new Error("O leiloeiro é obrigatório.");
    }

    if (!Number.isSafeInteger(this.lanceInicial) || this.lanceInicial <= 0) {
      throw new Error("O lance inicial deve ser maior que zero.");
    }

    if (
      !Number.isSafeInteger(this.incrementoMinimo) ||
      this.incrementoMinimo <= 0
    ) {
      throw new Error("O incremento mínimo deve ser maior que zero.");
    }

    if (
      !Number.isFinite(this.horarioInicio.getTime()) ||
      !Number.isFinite(this.horarioFim.getTime()) ||
      this.horarioInicio >= this.horarioFim
    ) {
      throw new Error("O período do lote é inválido.");
    }
  }

  public encerrar(agora: Date = new Date()): boolean {
    if (this.canceladoEm !== null) {
      throw new Error("Não é possível encerrar um lote cancelado.");
    }

    if (agora < this.horarioFim) {
      throw new Error("O lote ainda não atingiu o encerramento.");
    }

    if (this.encerradoEm !== null) {
      return false;
    }

    this.encerradoEm = new Date(agora);

    return true;
  }

  public obterEncerradoEm(): Date | null {
    return this.encerradoEm ? new Date(this.encerradoEm) : null;
  }

  public validarOferta(
    licitanteId: string,
    valorMonetario: number,
    lanceLider: Lance | null,
    agora: Date = new Date()
  ): void {
    if (this.obterSituacao(agora) !== SituacaoLote.EM_ANDAMENTO) {
      throw new Error("O lote não está em andamento.");
    }

    if (!Number.isSafeInteger(valorMonetario) || valorMonetario <= 0) {
      throw new Error("O valor do lance é inválido.");
    }

    if (lanceLider !== null) {
      if (lanceLider.obterLoteId() !== this.id) {
        throw new Error("O lance líder não pertence ao lote.");
      }

      if (lanceLider.obterLicitanteId() === licitanteId) {
        throw new Error("Você já está liderando este lote.");
      }
    }

    const valorMinimo =
      lanceLider === null
        ? this.lanceInicial
        : lanceLider.obterValorMonetario() + this.incrementoMinimo;

    if (!Number.isSafeInteger(valorMinimo) || valorMonetario < valorMinimo) {
      throw new Error("O lance está abaixo do valor mínimo permitido.");
    }
  }

  public obterSituacao(agora: Date = new Date()): SituacaoLote {
    if (this.canceladoEm !== null) {
      return SituacaoLote.CANCELADO;
    }

    if (agora < this.horarioInicio) {
      return SituacaoLote.AGENDADO;
    }

    if (agora < this.horarioFim) {
      return SituacaoLote.EM_ANDAMENTO;
    }

    return SituacaoLote.ENCERRADO;
  }

  public cancelar(possuiLances: boolean, agora: Date = new Date()): void {
    if (this.canceladoEm !== null) {
      throw new Error("O lote já está cancelado.");
    }

    if (this.obterSituacao(agora) === SituacaoLote.ENCERRADO) {
      throw new Error("Não é possível cancelar um lote encerrado.");
    }

    if (possuiLances) {
      throw new Error("Não é possível cancelar um lote que possui lances.");
    }

    this.canceladoEm = new Date(agora);
  }

  public prorrogarFim(agora: Date = new Date()): boolean {
    if (
      this.prorrogado ||
      this.obterSituacao(agora) !== SituacaoLote.EM_ANDAMENTO
    ) {
      return false;
    }

    const doisMinutos = 2 * 60 * 1000;
    const tempoRestante = this.horarioFim.getTime() - agora.getTime();

    if (tempoRestante > doisMinutos) {
      return false;
    }

    this.horarioFim = new Date(this.horarioFim.getTime() + doisMinutos);

    this.prorrogado = true;

    return true;
  }

  public obterId(): string {
    return this.id;
  }

  public obterLeiloeiroId(): string {
    return this.leiloeiroId;
  }

  public obterItem(): Item {
    return this.item;
  }

  public obterLanceInicial(): number {
    return this.lanceInicial;
  }

  public obterIncrementoMinimo(): number {
    return this.incrementoMinimo;
  }

  public obterHorarioInicio(): Date {
    return new Date(this.horarioInicio);
  }

  public obterHorarioFim(): Date {
    return new Date(this.horarioFim);
  }

  public obterCanceladoEm(): Date | null {
    return this.canceladoEm ? new Date(this.canceladoEm) : null;
  }
}
