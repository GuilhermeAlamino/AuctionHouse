
import { describe, expect, it } from "vitest";

import { Comprovante } from "../../../backend/src/domain/entities/comprovante.js";

describe("Comprovante", () => {
  type DadosComprovante =
    ConstructorParameters<typeof Comprovante>[0];

  function criarComprovante(
    sobrescritas: Partial<DadosComprovante> = {}
  ): Comprovante {
    return new Comprovante({
      id: "comprovante-001",
      loteId: "lote-001",
      licitanteId: "usuario-001",
      lanceVencedorId: "lance-001",
      ...sobrescritas,
    });
  }

  it("deve criar um comprovante válido", () => {
    const comprovante = criarComprovante();

    expect(comprovante.obterId()).toBe("comprovante-001");
    expect(comprovante.obterLoteId()).toBe("lote-001");
    expect(comprovante.obterLicitanteId()).toBe("usuario-001");
    expect(comprovante.obterLanceVencedorId()).toBe("lance-001");
  });

  it("deve remover espaços das extremidades", () => {
    const comprovante = criarComprovante({
      id: "  comprovante-001  ",
      loteId: "  lote-001  ",
      licitanteId: "  usuario-001  ",
      lanceVencedorId: "  lance-001  ",
    });

    expect(comprovante.obterId()).toBe("comprovante-001");
    expect(comprovante.obterLoteId()).toBe("lote-001");
    expect(comprovante.obterLicitanteId()).toBe("usuario-001");
    expect(comprovante.obterLanceVencedorId()).toBe("lance-001");
  });

  it.each([
    [
      "id",
      { id: " " },
      "O identificador do comprovante é obrigatório.",
    ],
    [
      "loteId",
      { loteId: "" },
      "O lote é obrigatório.",
    ],
    [
      "licitanteId",
      { licitanteId: " " },
      "O licitante é obrigatório.",
    ],
    [
      "lanceVencedorId",
      { lanceVencedorId: "" },
      "O lance vencedor é obrigatório.",
    ],
  ] as const)(
    "deve rejeitar comprovante com %s inválido",
    (_campo, dados, mensagem) => {
      expect(() => criarComprovante(dados)).toThrow(mensagem);
    }
  );
});
