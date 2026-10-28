
import { beforeAll, describe, expect, it } from "vitest";

import { Usuario } from "../../../backend/src/domain/entities/usuario.js";
import { Email } from "../../../backend/src/domain/value-objects/email.js";
import { Senha } from "../../../backend/src/domain/value-objects/senha.js";
import { PapelUsuario } from "../../../backend/src/domain/enums/papelUsuario.js";

describe("Usuario", () => {
  let senha: Senha;

  beforeAll(async () => {
    senha = await Senha.criar("MinhaSenha@123");
  });

  function criarUsuario(
    sobrescritas: Partial<ConstructorParameters<typeof Usuario>[0]> = {}
  ): Usuario {
    return new Usuario({
      id: "usuario-001",
      nome: "Maria Silva",
      apelido: "maria",
      email: new Email("maria@exemplo.com"),
      senha,
      papelUsuario: PapelUsuario.LICITANTE,
      ...sobrescritas,
    });
  }

  it("deve criar um usuário licitante", () => {
    const usuario = criarUsuario();

    expect(usuario.obterId()).toBe("usuario-001");
    expect(usuario.obterNome()).toBe("Maria Silva");
    expect(usuario.obterApelido()).toBe("maria");
    expect(usuario.obterPapelUsuario()).toBe(PapelUsuario.LICITANTE);
  });

  it("deve criar um usuário leiloeiro", () => {
    const usuario = criarUsuario({
      papelUsuario: PapelUsuario.LEILOEIRO,
    });

    expect(usuario.obterPapelUsuario()).toBe(PapelUsuario.LEILOEIRO);
  });

  it("deve preservar os objetos Email e Senha", () => {
    const usuario = criarUsuario();

    expect(usuario.obterEmail().obterValor()).toBe("maria@exemplo.com");
    expect(usuario.obterSenha()).toBe(senha);
  });

  it("deve remover espaços do nome e apelido", () => {
    const usuario = criarUsuario({
      nome: "  Maria Silva  ",
      apelido: "  maria  ",
    });

    expect(usuario.obterNome()).toBe("Maria Silva");
    expect(usuario.obterApelido()).toBe("maria");
  });

  it.each([
    ["id", { id: "  " }, "O identificador do usuário é obrigatório."],
    ["nome", { nome: "  " }, "O nome do usuário é obrigatório."],
    ["apelido", { apelido: "  " }, "O apelido do usuário é obrigatório."],
  ] as const)(
    "deve rejeitar usuário com %s vazio",
    (_campo, dados, mensagem) => {
      expect(() => criarUsuario(dados)).toThrow(mensagem);
    }
  );
});
