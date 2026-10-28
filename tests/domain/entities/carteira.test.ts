
import { describe, expect, it } from "vitest";
import { Carteira } from "../../../backend/src/domain/entities/carteira.js";

describe("Carteira", () => {
  type DadosCarteira = ConstructorParameters<typeof Carteira>[0];

  function criarCarteira(
    sobrescritas: Partial<DadosCarteira> = {}
  ): Carteira {
    return new Carteira({
      id: "carteira-001",
      usuarioId: "usuario-001",
      saldoTotal: 50000,
      saldoComprometido: 0,
      ...sobrescritas,
    });
  }

  it("deve criar uma carteira válida", () => {
    const carteira = criarCarteira();

    expect(carteira.obterId()).toBe("carteira-001");
    expect(carteira.obterUsuarioId()).toBe("usuario-001");
    expect(carteira.obterSaldoTotal()).toBe(50000);
    expect(carteira.obterSaldoComprometido()).toBe(0);
    expect(carteira.obterSaldoDisponivel()).toBe(50000);
  });

  it("deve iniciar sem saldo quando não informado", () => {
    const carteira = new Carteira({
      id: "carteira-001",
      usuarioId: "usuario-001",
    });

    expect(carteira.obterSaldoTotal()).toBe(0);
    expect(carteira.obterSaldoDisponivel()).toBe(0);
  });

  it("deve depositar saldo", () => {
    const carteira = criarCarteira();

    carteira.depositarSaldo(10000);

    expect(carteira.obterSaldoTotal()).toBe(60000);
    expect(carteira.obterSaldoDisponivel()).toBe(60000);
  });

  it("deve comprometer o valor de um lance", () => {
    const carteira = criarCarteira();

    carteira.comprometer(20000);

    expect(carteira.obterSaldoTotal()).toBe(50000);
    expect(carteira.obterSaldoComprometido()).toBe(20000);
    expect(carteira.obterSaldoDisponivel()).toBe(30000);
  });

  it("não deve comprometer saldo insuficiente", () => {
    const carteira = criarCarteira();

    expect(() => carteira.comprometer(60000)).toThrow(
      "Saldo disponível insuficiente."
    );

    expect(carteira.obterSaldoComprometido()).toBe(0);
  });

  it("deve permitir comprometer todo o saldo disponível", () => {
    const carteira = criarCarteira();

    carteira.comprometer(50000);

    expect(carteira.obterSaldoDisponivel()).toBe(0);
    expect(carteira.obterSaldoComprometido()).toBe(50000);
  });

  it("deve liberar o saldo de um lance superado", () => {
    const carteira = criarCarteira({
      saldoComprometido: 20000,
    });

    carteira.liberarSaldo(20000);

    expect(carteira.obterSaldoComprometido()).toBe(0);
    expect(carteira.obterSaldoDisponivel()).toBe(50000);
  });

  it("não deve liberar valor superior ao comprometido", () => {
    const carteira = criarCarteira({
      saldoComprometido: 10000,
    });

    expect(() => carteira.liberarSaldo(20000)).toThrow(
      "O valor excede o saldo comprometido."
    );

    expect(carteira.obterSaldoComprometido()).toBe(10000);
  });

  it("deve debitar o valor comprometido após arrematação", () => {
    const carteira = criarCarteira({
      saldoComprometido: 20000,
    });

    carteira.debitar(20000);

    expect(carteira.obterSaldoTotal()).toBe(30000);
    expect(carteira.obterSaldoComprometido()).toBe(0);
    expect(carteira.obterSaldoDisponivel()).toBe(30000);
  });

  it("não deve debitar saldo não comprometido", () => {
    const carteira = criarCarteira();

    expect(() => carteira.debitar(10000)).toThrow(
      "O débito deve utilizar saldo previamente comprometido."
    );

    expect(carteira.obterSaldoTotal()).toBe(50000);
  });

  it("deve creditar o valor recebido pelo leiloeiro", () => {
    const carteira = criarCarteira({
      saldoTotal: 0,
    });

    carteira.creditar(20000);

    expect(carteira.obterSaldoTotal()).toBe(20000);
    expect(carteira.obterSaldoDisponivel()).toBe(20000);
  });

  it.each([
    ["id", { id: " " }, "O identificador da carteira é obrigatório."],
    ["usuarioId", { usuarioId: "" }, "O usuário da carteira é obrigatório."],
    ["saldoTotal", { saldoTotal: -1 }, "O saldo total é inválido."],
    [
      "saldoComprometido",
      { saldoComprometido: 60000 },
      "O saldo comprometido é inválido.",
    ],
    [
      "saldo fracionário",
      { saldoTotal: 100.5 },
      "O saldo total é inválido.",
    ],
  ] as const)(
    "deve rejeitar %s inválido",
    (_campo, dados, mensagem) => {
      expect(() => criarCarteira(dados)).toThrow(mensagem);
    }
  );

  it.each([0, -100, 10.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "deve rejeitar operação com valor inválido: %s",
    (valor) => {
      const carteira = criarCarteira();

      expect(() => carteira.depositarSaldo(valor)).toThrow(
        "O valor deve ser um inteiro positivo em centavos."
      );

      expect(() => carteira.creditar(valor)).toThrow(
        "O valor deve ser um inteiro positivo em centavos."
      );

      expect(() => carteira.comprometer(valor)).toThrow(
        "O valor deve ser um inteiro positivo em centavos."
      );

      expect(() => carteira.liberarSaldo(valor)).toThrow(
        "O valor deve ser um inteiro positivo em centavos."
      );

      expect(() => carteira.debitar(valor)).toThrow(
        "O valor deve ser um inteiro positivo em centavos."
      );
    }
  );

  it("não deve ultrapassar o limite seguro de saldo", () => {
    const carteira = criarCarteira({
      saldoTotal: Number.MAX_SAFE_INTEGER,
    });

    expect(() => carteira.depositarSaldo(1)).toThrow(
      "O saldo total excede o limite permitido."
    );

    expect(carteira.obterSaldoTotal()).toBe(
      Number.MAX_SAFE_INTEGER
    );
  });
});
