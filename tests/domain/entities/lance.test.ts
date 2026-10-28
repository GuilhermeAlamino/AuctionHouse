import { describe, expect, it } from "vitest";

import { Lance } from "../../../backend/src/domain/entities/lance.js";

describe("Lance", () => {
  type DadosLance = ConstructorParameters<typeof Lance>[0];

  function criarLance(sobrescritas: Partial<DadosLance> = {}): Lance {
    return new Lance({
      id: "lance-001",
      loteId: "lote-001",
      licitanteId: "usuario-001",
      valorMonetario: 10500,
      realizadoEm: new Date("2026-10-27T18:30:00Z"),
      ...sobrescritas,
    });
  }

  it("deve criar um lance válido", () => {
    const lance = criarLance();

    expect(lance.obterId()).toBe("lance-001");
    expect(lance.obterLoteId()).toBe("lote-001");
    expect(lance.obterLicitanteId()).toBe("usuario-001");
    expect(lance.obterValorMonetario()).toBe(10500);
    expect(lance.obterRealizadoEm()).toEqual(new Date("2026-10-27T18:30:00Z"));
  });

  it("deve remover espaços dos identificadores", () => {
    const lance = criarLance({
      id: "  lance-001  ",
      loteId: "  lote-001  ",
      licitanteId: "  usuario-001  ",
    });

    expect(lance.obterId()).toBe("lance-001");
    expect(lance.obterLoteId()).toBe("lote-001");
    expect(lance.obterLicitanteId()).toBe("usuario-001");
  });

  it.each([
    [{ id: " " }, "O identificador do lance é obrigatório."],
    [{ loteId: "" }, "O lote é obrigatório."],
    [{ licitanteId: " " }, "O licitante é obrigatório."],
  ])("deve rejeitar identificadores inválidos", (dados, mensagem) => {
    expect(() => criarLance(dados)).toThrow(mensagem);
  });

  it.each([
    0,
    -100,
    100.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])("deve rejeitar o valor monetário inválido: %s", (valor) => {
    expect(() => criarLance({ valorMonetario: valor })).toThrow(
      "O valor do lance deve ser um inteiro positivo em centavos."
    );
  });

  it("deve rejeitar uma data inválida", () => {
    expect(() =>
      criarLance({
        realizadoEm: new Date("data-invalida"),
      })
    ).toThrow("A data do lance é inválida.");
  });

  it("não deve permitir alterar a data por uma referência externa", () => {
    const data = new Date("2026-10-27T18:30:00Z");

    const lance = criarLance({
      realizadoEm: data,
    });

    data.setFullYear(2030);

    const dataObtida = lance.obterRealizadoEm();
    dataObtida.setFullYear(2040);

    expect(lance.obterRealizadoEm()).toEqual(new Date("2026-10-27T18:30:00Z"));
  });
});
