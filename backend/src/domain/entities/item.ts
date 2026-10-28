type DadosItem = {
  id: string;
  titulo: string;
  descricao: string;
  imagem: string;
};

export class Item {
  private readonly id: string;
  private readonly titulo: string;
  private readonly descricao: string;
  private readonly imagem: string;

  constructor(dados: DadosItem) {
    this.id = dados.id.trim();
    this.titulo = dados.titulo.trim();
    this.descricao = dados.descricao.trim();
    this.imagem = dados.imagem.trim();

    this.validar();
  }

  private validar(): void {
    if (!this.id) {
      throw new Error("O identificador do item é obrigatório.");
    }

    if (!this.titulo) {
      throw new Error("O título do item é obrigatório.");
    }

    if (!this.descricao) {
      throw new Error("A descrição do item é obrigatória.");
    }

    if (!this.imagem) {
      throw new Error("A imagem do item é obrigatória.");
    }
  }

  public obterId(): string {
    return this.id;
  }

  public obterTitulo(): string {
    return this.titulo;
  }

  public obterDescricao(): string {
    return this.descricao;
  }

  public obterImagem(): string {
    return this.imagem;
  }
}
