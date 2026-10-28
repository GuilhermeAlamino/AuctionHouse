import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../api/endpoints";
import { moeda, nomeSituacao } from "../formatacao";
import type { Participacao } from "../types";

function descreverResultado(item: Participacao): string {
  if (item.arrematado) return item.liquidado ? "Arrematado" : "Venceu · aguardando liquidação";
  if (item.liderando) return "Liderando";
  if (item.situacao === "ENCERRADO") return "Não venceu";
  return "Superado";
}

export function MinhasParticipacoes({ token }: { token: string }) {
  const [participacoes, setParticipacoes] = useState<Participacao[] | null>(null);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api.participacoes(token)
      .then((resultado) => {
        if (ativo) { setParticipacoes(resultado); setErro(""); }
      })
      .catch((falha: unknown) => {
        if (ativo) setErro(falha instanceof Error ? falha.message : "Não foi possível consultar suas participações.");
      });
    return () => { ativo = false; };
  }, [token, tentativa]);

  return (
    <section aria-labelledby="participacoes-titulo">
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">MINHA CONTA / LICITANTE</p>
          <h1 id="participacoes-titulo">Minhas participações</h1>
          <p className="subtitulo-pagina">Veja os lotes em que você ofertou e acompanhe seus resultados.</p>
        </div>
        <Link className="btn btn-outline-dark" to="/carteira">Consultar carteira ↗</Link>
      </div>

      <div className="painel">
        <div className="painel-cabecalho">
          <h2>Lotes em que participei</h2>
          {participacoes && <span className="label-secundario">{participacoes.length} {participacoes.length === 1 ? "lote" : "lotes"}</span>}
        </div>

        {erro && (
          <div className="mensagem mensagem-erro mb-3" role="alert">
            <p className="mb-2">{erro}</p>
            <button className="btn btn-sm btn-outline-dark" type="button" onClick={() => setTentativa((atual) => atual + 1)}>
              Tentar novamente
            </button>
          </div>
        )}
        {!participacoes && !erro && <p role="status">Carregando participações...</p>}
        {participacoes?.length === 0 && (
          <div className="estado-vazio">
            <h3>Você ainda não participou de nenhum leilão.</h3>
            <p className="text-secondary">Explore os lotes em andamento para realizar seu primeiro lance.</p>
            <Link className="btn btn-principal" to="/">Explorar leilões</Link>
          </div>
        )}
        {participacoes && participacoes.length > 0 && (
          <div className="tabela-container table-responsive">
            <table className="table table-hover align-middle">
              <thead><tr><th scope="col">Produto</th><th scope="col">Situação do lote</th><th scope="col">Meu maior lance</th><th scope="col">Meu resultado</th><th scope="col">Ação</th></tr></thead>
              <tbody>
                {participacoes.map((item) => (
                  <tr key={item.loteId}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <img src={item.imagem} className="miniatura-tabela" alt="" loading="lazy" />
                        <span className="fw-semibold">{item.titulo}</span>
                      </div>
                    </td>
                    <td><span className={`estado estado-${item.situacao}`}>{nomeSituacao(item.situacao)}</span></td>
                    <td className="numeros">{moeda(item.meuMaiorLance)}</td>
                    <td><span className={item.arrematado || item.liderando ? "resultado-positivo" : ""}>{descreverResultado(item)}</span></td>
                    <td>
                      <div className="d-flex gap-2 flex-wrap">
                        <Link className="btn btn-sm btn-outline-dark" to={`/lotes/${item.loteId}`}>Ver lote</Link>
                        {item.arrematado && item.liquidado && (
                          <Link className="btn btn-sm btn-principal" to={`/lotes/${item.loteId}/comprovante`}>Comprovante</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
