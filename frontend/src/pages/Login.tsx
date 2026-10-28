import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { api } from "../api/endpoints";
import type { Sessao } from "../types";

export function Login({ autenticar }: { autenticar: (sessao: Sessao) => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try { autenticar(await api.entrar(email, senha)); }
    catch (falha) { setErro(falha instanceof Error ? falha.message : "Não foi possível entrar."); }
    finally { setEnviando(false); }
  }

  return (
    <section className="login-conteudo">
      <div className="login-formulario">
        <p className="sobretitulo text-center mb-3">ACESSO À PLATAFORMA</p>
        <div className="painel">
          <h1 className="text-center">Entre na sua conta</h1>
          <p className="text-secondary text-center mb-4">Use as credenciais fornecidas para participar dos leilões.</p>
          <form onSubmit={(evento) => void entrar(evento)}>
            <div className="mb-3">
              <label className="form-label" htmlFor="email">E-mail</label>
              <input id="email" type="email" className="form-control" placeholder="seu@email.com" required autoComplete="username"
                value={email} onChange={(evento) => setEmail(evento.target.value)} />
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="senha">Senha</label>
              <input id="senha" type="password" className="form-control" placeholder="Sua senha" required autoComplete="current-password"
                value={senha} onChange={(evento) => setSenha(evento.target.value)} />
            </div>
            <button className="btn btn-principal w-100" disabled={enviando} type="submit">
              {enviando ? "Autenticando..." : "Entrar"}
            </button>
            {erro && <p className="mensagem mensagem-erro" role="alert">{erro}</p>}
          </form>
          <p className="small text-secondary text-center mt-4 mb-0">Não há cadastro público nesta versão.</p>
        </div>
        <p className="text-center mt-4 small"><Link className="link-acao" to="/">← Voltar aos leilões</Link></p>
      </div>
    </section>
  );
}
