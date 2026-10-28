
import { describe, expect, it } from "vitest";
import { Senha } from "../../../backend/src/domain/value-objects/senha.js";

describe("Senha", () => {
  it("deve gerar um hash para uma senha válida", async () => {
    const senha = await Senha.criar("MinhaSenha@123");

    expect(senha.obterHash()).not.toBe("MinhaSenha@123");
    expect(senha.obterHash()).toMatch(/^\$2[aby]\$/);
  });

  it("deve validar a senha correta", async () => {
    const senha = await Senha.criar("MinhaSenha@123");

    expect(await senha.validarSenha("MinhaSenha@123")).toBe(true);
  });

  it("deve rejeitar uma senha incorreta", async () => {
    const senha = await Senha.criar("MinhaSenha@123");

    expect(await senha.validarSenha("SenhaErrada")).toBe(false);
  });

  it("não deve permitir uma senha vazia", async () => {
    await expect(Senha.criar("   ")).rejects.toThrow(
      "A senha é obrigatória."
    );
  });

  it("não deve aceitar senhas acima do limite do bcrypt", async () => {
    await expect(Senha.criar("a".repeat(73))).rejects.toThrow(
      "A senha excede o tamanho permitido."
    );
  });

  it("deve restaurar uma senha a partir do hash", async () => {
    const original = await Senha.criar("MinhaSenha@123");
    const restaurada = Senha.restaurar(original.obterHash());

    expect(
      await restaurada.validarSenha("MinhaSenha@123")
    ).toBe(true);
  });

  it("não deve restaurar um hash inválido", () => {
    expect(() => Senha.restaurar("senha123")).toThrow(
      "O hash da senha é inválido."
    );
  });
});
