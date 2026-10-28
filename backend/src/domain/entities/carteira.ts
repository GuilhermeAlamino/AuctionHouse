
type DadosCarteira = {
  id: string;
  usuarioId: string;
  saldoTotal?: number;
  saldoComprometido?: number;
};

export class Carteira {
  private readonly id: string;
  private readonly usuarioId: string;
  private saldoTotal: number;
  private saldoComprometido: number;

  constructor(dados: DadosCarteira) {
    this.id = dados.id.trim();
    this.usuarioId = dados.usuarioId.trim();
    this.saldoTotal = dados.saldoTotal ?? 0;
    this.saldoComprometido = dados.saldoComprometido ?? 0;

    this.validar();
  }

  private validar(): void {
    if (!this.id) {
      throw new Error("O identificador da carteira é obrigatório.");
    }

    if (!this.usuarioId) {
      throw new Error("O usuário da carteira é obrigatório.");
    }

    if (
      !Number.isSafeInteger(this.saldoTotal) ||
      this.saldoTotal < 0
    ) {
      throw new Error("O saldo total é inválido.");
    }

    if (
      !Number.isSafeInteger(this.saldoComprometido) ||
      this.saldoComprometido < 0 ||
      this.saldoComprometido > this.saldoTotal
    ) {
      throw new Error("O saldo comprometido é inválido.");
    }
  }

  private validarValor(valor: number): void {
    if (!Number.isSafeInteger(valor) || valor <= 0) {
      throw new Error(
        "O valor deve ser um inteiro positivo em centavos."
      );
    }
  }

  private adicionarSaldo(valor: number): void {
    this.validarValor(valor);

    const novoSaldo = this.saldoTotal + valor;

    if (!Number.isSafeInteger(novoSaldo)) {
      throw new Error("O saldo total excede o limite permitido.");
    }

    this.saldoTotal = novoSaldo;
  }

  public depositarSaldo(valor: number): void {
    this.adicionarSaldo(valor);
  }

  public creditar(valor: number): void {
    this.adicionarSaldo(valor);
  }

  public comprometer(valor: number): void {
    this.validarValor(valor);

    if (valor > this.obterSaldoDisponivel()) {
      throw new Error("Saldo disponível insuficiente.");
    }

    this.saldoComprometido += valor;
  }

  public liberarSaldo(valor: number): void {
    this.validarValor(valor);

    if (valor > this.saldoComprometido) {
      throw new Error("O valor excede o saldo comprometido.");
    }

    this.saldoComprometido -= valor;
  }

  public debitar(valor: number): void {
    this.validarValor(valor);

    if (valor > this.saldoComprometido) {
      throw new Error(
        "O débito deve utilizar saldo previamente comprometido."
      );
    }

    this.saldoTotal -= valor;
    this.saldoComprometido -= valor;
  }

  public obterId(): string {
    return this.id;
  }

  public obterUsuarioId(): string {
    return this.usuarioId;
  }

  public obterSaldoTotal(): number {
    return this.saldoTotal;
  }

  public obterSaldoComprometido(): number {
    return this.saldoComprometido;
  }

  public obterSaldoDisponivel(): number {
    return this.saldoTotal - this.saldoComprometido;
  }
}
