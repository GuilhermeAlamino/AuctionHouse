import { Email } from "../../domain/value-objects/email.js";
import { Senha } from "../../domain/value-objects/senha.js";
import { executarEmTransacao } from "../../infrastructure/database/transacao.js";

type Entrada = {
  email: string;
  senha: string;
};

export async function autenticarUsuario(entrada: Entrada) {
  const email = new Email(entrada.email);

  if (typeof entrada.senha !== "string" || !entrada.senha.trim()) {
    throw new Error("A senha é obrigatória.");
  }

  const usuario = await executarEmTransacao(({ usuarios }) =>
    usuarios.buscarCredenciaisPorEmail(email.obterValor())
  );

  if (!usuario) {
    throw new Error("Credenciais inválidas.");
  }

  const senha = Senha.restaurar(usuario.senhaHash);

  const senhaValida = await senha.validarSenha(entrada.senha);

  if (!senhaValida) {
    throw new Error("Credenciais inválidas.");
  }

  return {
    id: usuario.id,
    nome: usuario.nome,
    apelido: usuario.apelido,
    papel: usuario.papel,
  };
}