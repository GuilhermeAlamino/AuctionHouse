export class Email {
  private readonly valor: string;

  constructor(email: string) {
    const valor = email.trim();

    if (Email.validar(valor) === false) {
      throw new Error("O e-mail informado é inválido.");
    }

    this.valor = valor;
  }

  private static validar(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  public obterValor(): string {
    return this.valor;
  }
}
