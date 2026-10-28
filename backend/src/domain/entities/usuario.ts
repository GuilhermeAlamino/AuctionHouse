import { Email } from "../value-objects/email.js";
import { Senha } from "../value-objects/senha.js";
import { PapelUsuario } from "../enums/papelUsuario.js";

type DadosUsuario = {
  id: string;
  nome: string;
  apelido: string;
  email: Email;
  senha: Senha;
  papelUsuario: PapelUsuario;
};

export class Usuario {
  private readonly id: string;
  private readonly nome: string;
  private readonly apelido: string;
  private readonly email: Email;
  private readonly senha: Senha;
  private readonly papelUsuario: PapelUsuario;

  constructor(dados: DadosUsuario) {
    const id = dados.id.trim();
    const nome = dados.nome.trim();
    const apelido = dados.apelido.trim();

    if (!id) {
      throw new Error("O identificador do usuário é obrigatório.");
    }

    if (!nome) {
      throw new Error("O nome do usuário é obrigatório.");
    }

    if (!apelido) {
      throw new Error("O apelido do usuário é obrigatório.");
    }

    this.id = id;
    this.nome = nome;
    this.apelido = apelido;
    this.email = dados.email;
    this.senha = dados.senha;
    this.papelUsuario = dados.papelUsuario;
  }

  public obterId(): string {
    return this.id;
  }

  public obterNome(): string {
    return this.nome;
  }

  public obterApelido(): string {
    return this.apelido;
  }

  public obterEmail(): Email {
    return this.email;
  }

  public obterSenha(): Senha {
    return this.senha;
  }

  public obterPapelUsuario(): PapelUsuario {
    return this.papelUsuario;
  }
}
