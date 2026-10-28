import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../api/endpoints";
import { dataHora, moeda } from "../formatacao";
import type { Comprovante as DadosComprovante } from "../types";

export function Comprovante() {
  const { id } = useParams<{ id: string }>();
  const [dados, setDados] = useState<DadosComprovante | null>(null);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    void api.comprovante(id).then((valor) => { if (ativo) { setDados(valor); setErro(""); } })
      .catch((falha: unknown) => { if (ativo) setErro(falha instanceof Error ? falha.message : "Comprovante indisponível."); });
    return () => { ativo = false; };
  }, [id, tentativa]);

  async function copiarLink() {
    try { await navigator.clipboard.writeText(window.location.href); setMensagem("Link copiado para compartilhar."); }
    catch { setMensagem("Não foi possível copiar automaticamente. Copie o endereço desta página."); }
  }

  return (
    <section>
      <nav className="caminho-pagina" aria-label="Navegação estrutural"><Link to="/">Leilões</Link><span>/</span><Link to={`/lotes/${id}`}>Lote</Link><span>/</span><span>Comprovante</span></nav>
      <div className="cabecalho-pagina">
        <div><p className="sobretitulo">ARREMATAÇÃO / ACESSO PÚBLICO</p><h1>Comprovante de arrematação</h1>
          <p className="subtitulo-pagina">Registro público compartilhável, sem informações pessoais do vencedor.</p></div>
      </div>
      {erro && (
        <div className="mensagem mensagem-erro mb-4" role="alert">
          <p className="mb-2">{erro}</p>
          <button className="btn btn-sm btn-outline-dark" type="button" onClick={() => setTentativa((atual) => atual + 1)}>
            Tentar novamente
          </button>
        </div>
      )}
      {!dados && !erro && <div className="painel" role="status">Consultando comprovante...</div>}
      {dados && (
        <div className="painel">
          <div className="painel-cabecalho"><h2>Dados da arrematação</h2><span className="estado estado-EM_ANDAMENTO">Comprovante emitido</span></div>
          <div className="row g-4 align-items-start">
            <div className="col-12 col-md-4 col-lg-3"><img className="produto-grande" src={dados.item.imagem} alt={dados.item.titulo} /></div>
            <div className="col-12 col-md-5 col-lg-6">
              <p className="label-secundario">Produto arrematado</p><h2 className="mb-4">{dados.item.titulo}</h2>
              <p className="label-secundario">Valor de arrematação</p><p className="valor mb-4">{moeda(dados.valorArrematacao)}</p>
              <div className="row g-3">
                <div className="col-sm-6"><p className="label-secundario">Data do lance vencedor</p><p className="fw-semibold numeros mb-0">{dataHora(dados.lanceRealizadoEm)}</p></div>
                <div className="col-sm-6"><p className="label-secundario">Vencedor</p><p className="fw-semibold mb-0">{dados.vencedor}</p></div>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="caixa-codigo">
                <p className="label-secundario">Código do comprovante</p>
                <p className="small fw-semibold texto-mono text-break">{dados.id}</p>
                <button className="btn btn-principal w-100" type="button" onClick={() => void copiarLink()}>Copiar link ↗</button>
                {mensagem && <p className="small text-secondary mt-2 mb-0" role="status">{mensagem}</p>}
              </div>
            </div>
          </div>
          <div className="borda-separadora mt-4 pt-3"><Link className="link-acao" to={`/lotes/${id}`}>← Voltar ao lote</Link></div>
        </div>
      )}
    </section>
  );
}
