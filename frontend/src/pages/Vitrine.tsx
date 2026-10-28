import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "../api/endpoints";
import { contador, dataHora, moeda, nomeSituacao } from "../formatacao";
import type { LoteResumo, SituacaoLote } from "../types";

const secoes: { situacao: SituacaoLote; titulo: string; descricao: string }[] = [
  { situacao: "EM_ANDAMENTO", titulo: "Em andamento", descricao: "Lotes disponíveis para receber lances agora." },
  { situacao: "AGENDADO", titulo: "Agendados", descricao: "Disputas que começarão em breve." },
  { situacao: "ENCERRADO", titulo: "Encerrados", descricao: "Consulte os resultados e históricos dos leilões." },
];

function obterSituacaoNaTela(lote: LoteResumo, agora: number): SituacaoLote {
  if (lote.situacao === "CANCELADO") return "CANCELADO";
  if (new Date(lote.horarioInicio).getTime() > agora) return "AGENDADO";
  return new Date(lote.horarioFim).getTime() > agora ? "EM_ANDAMENTO" : "ENCERRADO";
}

export function Vitrine() {
  const [lotes, setLotes] = useState<LoteResumo[]>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [agora, setAgora] = useState(Date.now());
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const resultado = await api.lotes();
        if (ativo) { setLotes(resultado); setErro(""); }
      } catch (falha) {
        if (ativo) setErro(falha instanceof Error ? falha.message : "Não foi possível consultar os lotes.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();
    const atualizacao = window.setInterval(() => void carregar(), 15000);
    const relogio = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => {
      ativo = false;
      window.clearInterval(atualizacao);
      window.clearInterval(relogio);
    };
  }, [tentativa]);

  const publicados = lotes.filter((lote) => lote.situacao !== "CANCELADO");

  return (
    <section aria-labelledby="vitrine-titulo">
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">CATÁLOGO / LEILÕES</p>
          <h1 id="vitrine-titulo">Leilões</h1>
          <p className="subtitulo-pagina">Explore os lotes, acompanhe as ofertas e consulte resultados.</p>
        </div>
        {!carregando && <span className="label-secundario">{publicados.length} {publicados.length === 1 ? "lote publicado" : "lotes publicados"}</span>}
      </div>

      {erro && (
        <div className="mensagem mensagem-erro mb-4" role="alert">
          <p className="mb-2">{erro}</p>
          <button
            className="btn btn-sm btn-outline-dark"
            type="button"
            onClick={() => setTentativa((atual) => atual + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {carregando && <div className="painel" role="status">Carregando leilões...</div>}
      {!carregando && !erro && publicados.length === 0 && (
        <div className="painel estado-vazio">
          <h2>Nenhum lote disponível no momento.</h2>
          <p className="text-secondary mb-0">Os próximos leilões aparecerão aqui assim que forem criados.</p>
        </div>
      )}

      {!carregando && publicados.length > 0 && secoes.map((secao) => {
        const itens = publicados
          .filter((lote) => obterSituacaoNaTela(lote, agora) === secao.situacao)
          .sort((a, b) => secao.situacao === "ENCERRADO"
            ? Date.parse(b.horarioFim) - Date.parse(a.horarioFim)
            : Date.parse(secao.situacao === "AGENDADO" ? a.horarioInicio : a.horarioFim) -
              Date.parse(secao.situacao === "AGENDADO" ? b.horarioInicio : b.horarioFim));

        return (
          <section key={secao.situacao} className="secao-vitrine" aria-labelledby={`secao-${secao.situacao}`}>
            <div className="secao-vitrine-cabecalho">
              <div>
                <h2 id={`secao-${secao.situacao}`}>{secao.titulo} <span className="contagem-filtro">{itens.length}</span></h2>
                <p className="subtitulo-pagina">{secao.descricao}</p>
              </div>
            </div>

            {itens.length === 0 ? (
              <p className="secao-vitrine-vazia">Nenhum lote {secao.situacao === "EM_ANDAMENTO" ? "em andamento" : secao.situacao === "AGENDADO" ? "agendado" : "encerrado"}.</p>
            ) : (
              <div className="row g-3 g-lg-4">
                {itens.map((lote) => (
                  <div key={lote.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                    <article className="lote-card">
                      <div className="imagem"><img src={lote.item.imagem} alt={lote.item.titulo} loading="lazy" /></div>
                      <div className="conteudo">
                        <div className="d-flex justify-content-between align-items-center gap-2 w-100">
                          <span className="indice-lote">Lote {lote.id.slice(0, 8)}</span>
                          <span className={`estado estado-${secao.situacao}`}>{nomeSituacao(secao.situacao)}</span>
                        </div>
                        <h3>{lote.item.titulo}</h3>
                        <p className="label-secundario">{secao.situacao === "AGENDADO" ? "Lance inicial" : secao.situacao === "ENCERRADO" ? "Valor final" : "Valor atual"}</p>
                        <p className="valor-pequeno mb-3">{moeda(lote.valorAtual)}</p>
                        <div className="rodape-card w-100">
                          <p className="label-secundario">{secao.situacao === "AGENDADO" ? "Início previsto" : secao.situacao === "ENCERRADO" ? "Encerramento" : "Encerra em"}</p>
                          <p className="fw-semibold numeros mb-0">{secao.situacao === "EM_ANDAMENTO"
                            ? contador(lote.horarioFim, agora)
                            : dataHora(secao.situacao === "AGENDADO" ? lote.horarioInicio : lote.horarioFim)}</p>
                          <Link to={`/lotes/${lote.id}`} className="btn btn-outline-dark w-100 d-flex align-items-center justify-content-between">
                            Ver lote <span aria-hidden="true">↗</span>
                          </Link>
                        </div>
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </section>
  );
}
