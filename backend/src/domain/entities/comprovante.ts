type DadosComprovante = {
  id: string;
  loteId: string;
  licitanteId: string;
  lanceVencedorId: string;
};

export class Comprovante {
  private readonly id: string;
  private readonly loteId: string;
  private readonly licitanteId: string;
  private readonly lanceVencedorId: string;

  constructor(dados: DadosComprovante) {
    this.id = dados.id.trim();
    this.loteId = dados.loteId.trim();
    this.licitanteId = dados.licitanteId.trim();
    this.lanceVencedorId = dados.lanceVencedorId.trim();

    this.validar();
  }

  private validar(): void {
    if (!this.id) {
      throw new Error(
        "O identificador do comprovante é obrigatório."
      );
    }

    if (!this.loteId) {
      throw new Error("O lote é obrigatório.");
    }

    if (!this.licitanteId) {
      throw new Error("O licitante é obrigatório.");
    }

    if (!this.lanceVencedorId) {
      throw new Error("O lance vencedor é obrigatório.");
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

  public obterLanceVencedorId(): string {
    return this.lanceVencedorId;
  }
}
