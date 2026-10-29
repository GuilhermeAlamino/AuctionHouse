import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { api } from "../api/endpoints";
import type { Sessao } from "../types";

// Contas fictícias disponibilizadas apenas para avaliação da plataforma.
const senhaDemonstracao = "leiloes2026";
const contasDemonstracao = [
  { papel: "Leiloeiro", email: "guilhermealmeida@demo.com" },
  { papel: "Licitante 1", email: "anasouza@demo.com" },
  { papel: "Licitante 2", email: "brunolima@demo.com" },
] as const;

export function Login({ autenticar }: { autenticar: (sessao: Sessao) => void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState("");

  async function copiar(texto: string, identificador: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(identificador);
    } catch {
      setCopiado("");
    }
  }

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
          <section className="border-top mt-4 pt-3" aria-labelledby="acessos-demo">
            <h2 id="acessos-demo" className="h6 mb-2">Acessos de demonstração</h2>
            <p className="small text-secondary mb-3">
              Escolha um usuário para preencher o login ou copie os dados abaixo.
            </p>
            {contasDemonstracao.map((conta) => (
              <div key={conta.email} className="border rounded p-2 mb-2">
                <strong className="small d-block mb-1">{conta.papel}</strong>
                <code className="small text-break d-block mb-2">{conta.email}</code>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm flex-fill"
                    onClick={() => void copiar(conta.email, conta.email)}
                  >
                    {copiado === conta.email ? "Copiado!" : "Copiar e-mail"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-principal btn-sm flex-fill"
                    onClick={() => {
                      setEmail(conta.email);
                      setSenha(senhaDemonstracao);
                      setErro("");
                    }}
                  >
                    Usar conta
                  </button>
                </div>
              </div>
            ))}
            <div className="small mt-3 d-flex align-items-center gap-2 flex-wrap">
              <span>Senha de todas as contas: <code>{senhaDemonstracao}</code></span>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => void copiar(senhaDemonstracao, "senha")}
              >
                {copiado === "senha" ? "Copiada!" : "Copiar senha"}
              </button>
            </div>
            <p className="small text-secondary mt-3 mb-0">
              Ambiente demonstrativo, com saldos fictícios e sem cadastro público.
            </p>
          </section>
        </div>
        <p className="text-center mt-4 small"><Link className="link-acao" to="/">← Voltar aos leilões</Link></p>
      </div>
    </section>
  );
}
