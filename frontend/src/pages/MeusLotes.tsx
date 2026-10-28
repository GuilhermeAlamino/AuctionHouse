import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

import { api } from "../api/endpoints";
import { moeda, nomeSituacao } from "../formatacao";
import type { ResultadoLeiloeiro } from "../types";

export function MeusLotes({ token }: { token: string }) {
  const [resultado, setResultado] = useState<ResultadoLeiloeiro | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const atualizar = useCallback(async () => {
    const dados = await api.meusLotes(token);
    setResultado(dados);
    setErro("");
  }, [token]);

  useEffect(() => {
    let ativo = true;

    void api.meusLotes(token)
      .then((dados) => {
        if (!ativo) return;
        setResultado(dados);
        setErro("");
      })
      .catch((falha: unknown) => {
        if (ativo) {
          setErro(falha instanceof Error ? falha.message : "Erro ao consultar lotes.");
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => { ativo = false; };
  }, [token]);

  async function tentarNovamente() {
    setCarregando(true);
    try {
      await atualizar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro ao consultar lotes.");
    } finally {
      setCarregando(false);
    }
  }

  async function cancelar(id: string) {
    if (!window.confirm("Deseja cancelar este lote? Esta ação não pode ser desfeita.")) {
      return;
    }

    setCancelando(id);
    setErro("");
    setMensagem("");

    try {
      await api.cancelarLote(id, token);
      await atualizar();
      setMensagem("Lote cancelado com sucesso.");
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Erro ao cancelar lote.");
    } finally {
      setCancelando(null);
    }
  }

  return (
    <section>
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">PAINEL / LEILOEIRO</p>
          <h1>Meus lotes</h1>
          <p className="subtitulo-pagina">Acompanhe disputas, encerramentos e resultados.</p>
        </div>
        <Link className="btn btn-principal" to="/criar-lote">+ Criar lote</Link>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-sm-6">
          <div className="metric-card">
            <p className="label-secundario">Total recebido em arrematações</p>
            <p className="valor">{resultado ? moeda(resultado.totalRecebido) : "—"}</p>
          </div>
        </div>
        <div className="col-sm-6">
          <div className="metric-card">
            <p className="label-secundario">Lotes cadastrados</p>
            <p className="valor">{resultado?.quantidadeLotes ?? "—"}</p>
          </div>
        </div>
      </div>

      {erro && (
        <div className="mensagem mensagem-erro mb-3" role="alert">
          <p className="mb-2">{erro}</p>
          <button
            className="btn btn-sm btn-outline-dark"
            type="button"
            onClick={() => void tentarNovamente()}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {mensagem && <p className="mensagem mensagem-ok mb-3" role="status">{mensagem}</p>}

      <div className="painel">
        <div className="painel-cabecalho">
          <h2>Histórico de lotes</h2>
          <span className="label-secundario">Inclui lotes cancelados</span>
        </div>

        {carregando && !resultado && <p role="status">Carregando lotes...</p>}
        {resultado && resultado.lotes.length === 0 && (
          <div className="py-3">
            <p className="text-secondary">Você ainda não criou lotes.</p>
            <Link className="btn btn-principal" to="/criar-lote">Criar primeiro lote</Link>
          </div>
        )}
        {resultado && resultado.lotes.length > 0 && (
          <div className="tabela-container table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Situação</th>
                  <th>Lances</th>
                  <th>Arrematação</th>
                  <th>Liquidação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {resultado.lotes.map((lote) => {
                  const podeCancelar =
                    (lote.situacao === "AGENDADO" || lote.situacao === "EM_ANDAMENTO") &&
                    lote.quantidadeLances === 0;

                  return (
                    <tr key={lote.loteId}>
                      <td>
                        <div className="d-flex gap-3 align-items-center">
                          <img src={lote.imagem} alt="" className="miniatura-tabela" />
                          <span className="fw-semibold">{lote.titulo}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`estado estado-${lote.situacao}`}>
                          {nomeSituacao(lote.situacao)}
                        </span>
                      </td>
                      <td className="numeros">{lote.quantidadeLances}</td>
                      <td className="numeros">
                        {lote.valorArrematacao === null ? "—" : moeda(lote.valorArrematacao)}
                      </td>
                      <td>
                        {lote.liquidado
                          ? "Liquidado"
                          : lote.situacao === "ENCERRADO" && lote.quantidadeLances === 0
                            ? "Sem vencedor"
                            : "—"}
                      </td>
                      <td>
                        <div className="d-flex gap-2 align-items-center flex-wrap">
                          {lote.situacao !== "CANCELADO" && (
                            <Link className="btn btn-sm btn-outline-dark" to={`/lotes/${lote.loteId}`}>
                              Ver lote
                            </Link>
                          )}
                          {podeCancelar && (
                            <button
                              className="btn btn-sm btn-outline-danger"
                              type="button"
                              disabled={cancelando === lote.loteId}
                              onClick={() => void cancelar(lote.loteId)}
                            >
                              {cancelando === lote.loteId ? "Cancelando..." : "Cancelar"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
