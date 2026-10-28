import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router";
import { api } from "../api/endpoints";
import { moeda, reaisParaCentavos } from "../formatacao";
import type { Carteira as DadosCarteira } from "../types";

export function Carteira({ token }: { token: string }) {
  const [carteira, setCarteira] = useState<DadosCarteira | null>(null);
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [depositando, setDepositando] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api.carteira(token)
      .then((dados) => {
        if (ativo) { setCarteira(dados); setErro(""); }
      })
      .catch((falha: unknown) => {
        if (ativo) setErro(falha instanceof Error ? falha.message : "Não foi possível carregar sua carteira.");
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => { ativo = false; };
  }, [token, tentativa]);

  async function depositar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const centavos = reaisParaCentavos(valor);

    if (centavos === null) {
      setErro("Informe um valor positivo válido em reais.");
      return;
    }

    setDepositando(true);
    setErro("");
    setMensagem("");
    try {
      const atualizada = await api.depositar(token, centavos);
      setCarteira(atualizada);
      setValor("");
      setMensagem("Depósito demonstrativo registrado com sucesso.");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível registrar o depósito.");
    } finally {
      setDepositando(false);
    }
  }

  return (
    <section aria-labelledby="carteira-titulo">
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">MINHA CONTA / LICITANTE</p>
          <h1 id="carteira-titulo">Minha carteira</h1>
          <p className="subtitulo-pagina">Consulte seu saldo e adicione créditos demonstrativos para ofertar.</p>
        </div>
        <Link className="btn btn-outline-dark" to="/minhas-participacoes">Minhas participações ↗</Link>
      </div>

      <div className="row g-3 mb-4" aria-live="polite">
        {([
          ["Saldo total", carteira?.saldoTotal],
          ["Comprometido em lances", carteira?.saldoComprometido],
          ["Disponível para ofertas", carteira?.saldoDisponivel],
        ] as const).map(([rotulo, quantia]) => (
          <div key={rotulo} className="col-12 col-sm-4">
            <div className="metric-card h-100">
              <p className="label-secundario">{rotulo}</p>
              <p className="valor mb-0">{quantia === undefined ? "—" : moeda(quantia)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="painel">
        <div className="painel-cabecalho">
          <h2>Depositar saldo</h2>
          <span className="label-secundario">Operação fictícia</span>
        </div>
        <p className="small text-secondary">Este depósito é uma simulação. Nenhum pagamento real será processado.</p>
        {carregando && <p role="status">Carregando carteira...</p>}
        <form onSubmit={(evento) => void depositar(evento)} className="d-flex flex-wrap align-items-end gap-2">
          <div>
            <label htmlFor="deposito" className="form-label">Valor do depósito (R$)</label>
            <input id="deposito" className="form-control campo-curto" placeholder="0,00"
              inputMode="decimal" value={valor} onChange={(evento) => setValor(evento.target.value)}
              disabled={depositando || carregando || !carteira} required />
          </div>
          <button className="btn btn-principal" type="submit" disabled={depositando || carregando || !carteira}>
            {depositando ? "Registrando..." : "Depositar saldo"}
          </button>
        </form>
        {erro && (
          <div className="mensagem mensagem-erro" role="alert">
            <p className="mb-2">{erro}</p>
            {!carteira && (
              <button className="btn btn-sm btn-outline-dark" type="button" onClick={() => {
                setCarregando(true);
                setTentativa((atual) => atual + 1);
              }}>
                Tentar novamente
              </button>
            )}
          </div>
        )}
        {mensagem && <p className="mensagem mensagem-ok" role="status">{mensagem}</p>}
      </div>
    </section>
  );
}
