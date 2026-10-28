import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api } from "../api/endpoints";
import { dataHora, moeda } from "../formatacao";
import type { Auditoria as DadosAuditoria } from "../types";

const rotulos: Record<DadosAuditoria["situacao"], string> = {
  INTEGRO: "Íntegro",
  INCONSISTENTE: "Inconsistente",
  NAO_VERIFICAVEL: "Não verificável",
};

export function Auditoria() {
  const { id } = useParams<{ id: string }>();
  const [dados, setDados] = useState<DadosAuditoria | null>(null);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    void api.auditoria(id)
      .then((valor) => { if (ativo) { setDados(valor); setErro(""); } })
      .catch((falha: unknown) => { if (ativo) setErro(falha instanceof Error ? falha.message : "Erro ao consultar auditoria."); });
    return () => { ativo = false; };
  }, [id, tentativa]);

  const mensagem = dados?.situacao === "INTEGRO"
    ? "O histórico corresponde à trilha assinada."
    : dados?.situacao === "INCONSISTENTE"
      ? "Foram detectadas divergências entre os registros e a trilha assinada."
      : "Não há evidências suficientes para atestar a integridade do histórico.";

  return (
    <section>
      <nav className="caminho-pagina" aria-label="Navegação estrutural"><Link to="/">Leilões</Link><span>/</span><Link to={`/lotes/${id}`}>Lote</Link><span>/</span><span>Auditoria</span></nav>
      <div className="cabecalho-pagina">
        <div><p className="sobretitulo">TRANSPARÊNCIA / ACESSO PÚBLICO</p><h1>Auditoria de lances</h1>
          <p className="subtitulo-pagina">Histórico cronológico e verificação de integridade do lote.</p></div>
        {dados && <span className={`estado ${dados.situacao === "INTEGRO" ? "estado-EM_ANDAMENTO" : dados.situacao === "INCONSISTENTE" ? "estado-CANCELADO" : "estado-ENCERRADO"}`}>
          Integridade: {rotulos[dados.situacao]}
        </span>}
      </div>
      {erro && (
        <div className="mensagem mensagem-erro mb-4" role="alert">
          <p className="mb-2">{erro}</p>
          <button className="btn btn-sm btn-outline-dark" type="button" onClick={() => setTentativa((atual) => atual + 1)}>
            Tentar novamente
          </button>
        </div>
      )}
      {!dados && !erro && <div className="painel" role="status">Verificando histórico de lances...</div>}
      {dados && (
        <div className="painel">
          <div className="painel-cabecalho"><h2>Resultado da verificação</h2><span className="label-secundario">{dados.quantidadeLances} lances registrados</span></div>
          <p className="small text-secondary mb-4">{mensagem}</p>
          <h2 className="mb-3">Lances do lote</h2>
          {dados.historico.length === 0 ? <p className="text-secondary mb-0">Ainda não há lances registrados neste lote.</p> : (
            <div className="tabela-container table-responsive"><table className="table table-hover align-middle">
              <thead><tr><th>Sequência</th><th>Valor ofertado</th><th>Participante</th><th>Data e hora</th></tr></thead>
              <tbody>{[...dados.historico].reverse().map((lance) => (
                <tr key={lance.sequencia}><td className="numeros">#{lance.sequencia}</td><td className="fw-semibold numeros">{moeda(lance.valorMonetario)}</td><td>{lance.licitante}</td><td className="numeros">{dataHora(lance.realizadoEm)}</td></tr>
              ))}</tbody>
            </table></div>
          )}
          <div className="borda-separadora mt-4 pt-3"><Link className="link-acao" to={`/lotes/${id}`}>← Voltar ao lote</Link></div>
        </div>
      )}
    </section>
  );
}
