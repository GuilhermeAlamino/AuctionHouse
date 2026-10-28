type DadosLance = {
  id: string;
  loteId: string;
  licitanteId: string;
  valorMonetario: number;
  realizadoEm: Date;
};

export class Lance {
  private readonly id: string;
  private readonly loteId: string;
  private readonly licitanteId: string;
  private readonly valorMonetario: number;
  private readonly realizadoEm: Date;

  constructor(dados: DadosLance) {
    this.id = dados.id.trim();
    this.loteId = dados.loteId.trim();
    this.licitanteId = dados.licitanteId.trim();
    this.valorMonetario = dados.valorMonetario;
    this.realizadoEm = new Date(dados.realizadoEm);

    this.validar();
  }

  private validar(): void {
    if (!this.id) {
      throw new Error("O identificador do lance é obrigatório.");
    }

    if (!this.loteId) {
      throw new Error("O lote é obrigatório.");
    }

    if (!this.licitanteId) {
      throw new Error("O licitante é obrigatório.");
    }

    if (
      !Number.isSafeInteger(this.valorMonetario) ||
      this.valorMonetario <= 0
    ) {
      throw new Error("O valor do lance deve ser um inteiro positivo em centavos.");
    }

    if (!Number.isFinite(this.realizadoEm.getTime())) {
      throw new Error("A data do lance é inválida.");
    }
  }

  public obterId(): string {
    return this.id;
  }

  public obterLoteId(): string {
    return this.loteId;
  }

  public obterLicitanteId(): string {
    return this.licitanteId;
  }

  public obterValorMonetario(): number {
    return this.valorMonetario;
  }

  public obterRealizadoEm(): Date {
    return new Date(this.realizadoEm);
  }
}
