import { describe, expect, it } from "vitest";
import { Email } from "../../../backend/src/domain/value-objects/email.js";

describe("Email", () => {
  it("deve criar um e-mail válido", () => {
    const email = new Email("usuario@exemplo.com");

    expect(email.obterValor()).toBe("usuario@exemplo.com");
  });

  it("deve remover espaços nas extremidades", () => {
    const email = new Email("  usuario@exemplo.com  ");

    expect(email.obterValor()).toBe("usuario@exemplo.com");
  });

  it.each([
    "",
    "   ",
    "usuario",
    "usuario@",
    "@exemplo.com",
    "usuario@exemplo",
    "usuario @exemplo.com",
  ])("deve rejeitar o e-mail inválido: %s", (valor) => {
    expect(() => new Email(valor)).toThrow(
      "O e-mail informado é inválido."
    );
  });
});
