import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useParams } from "react-router";
import { api } from "../api/endpoints";
import { contador, dataHora, moeda, nomeSituacao, reaisParaCentavos } from "../formatacao";
import type { LoteDetalhe, MinhaSituacao, Sessao } from "../types";

export function SalaLote({ sessao }: { sessao: Sessao | null }) {
  const { id } = useParams<{ id: string }>();
  const [lote, setLote] = useState<LoteDetalhe | null>(null);
  const [minhaSituacao, setMinhaSituacao] = useState<MinhaSituacao | null>(null);
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [agora, setAgora] = useState(Date.now());
  const [erroConexao, setErroConexao] = useState("");

  const licitante = sessao?.usuario.papel === "LICITANTE";
  const token = licitante ? sessao.token : undefined;

  const atualizar = useCallback(async () => {
    if (!id) return;

    // A atualização pública não depende da consulta privada do licitante.
    const detalhe = await api.lote(id);
    setLote(detalhe);
    setErroConexao("");

    if (!token) {
      setMinhaSituacao(null);
      return;
    }

    try {
      setMinhaSituacao(await api.minhaSituacao(id, token));
    } catch (falha) {
      console.warn("[SalaLote] Falha ao consultar minha situação:", falha);
      setMinhaSituacao(null);
    }
  }, [id, token]);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        await atualizar();
      } catch (falha) {
        if (ativo) {
          setErroConexao(falha instanceof Error ? falha.message : "Erro ao consultar lote.");
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();

    const eventos = id ? new EventSource(`/api/lotes/${id}/eventos`) : null;

    eventos?.addEventListener("atualizacao", (evento) => {
      console.debug("[SSE] Atualização recebida:", (evento as MessageEvent).data);
      void carregar();
    });

    if (eventos) {
      eventos.onopen = () => {
        console.debug("[SSE] Conectado ao lote:", id);
        void carregar();
      };
      eventos.onerror = () => {
        console.warn("[SSE] Conexão interrompida; aguardando reconexão.");
      };
    }

    // Apenas recuperação de eventos perdidos e mudanças de estado por horário.
    const fallback = window.setInterval(() => void carregar(), 30_000);
    const relogio = window.setInterval(() => setAgora(Date.now()), 1000);

    return () => {
      ativo = false;
      eventos?.close();
      window.clearInterval(fallback);
      window.clearInterval(relogio);
    };
  }, [id, atualizar]);

  async function ofertar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!id || !token || !lote) return;
    const centavos = reaisParaCentavos(valor);
    if (centavos === null) { setErro("Informe um valor válido em reais."); return; }
    if (lote.proximoLanceMinimo !== null && centavos < lote.proximoLanceMinimo) {
      setErro(`O próximo lance deve ser de pelo menos ${moeda(lote.proximoLanceMinimo)}.`);
      return;
    }
    setEnviando(true); setErro(""); setMensagem("");
    try {
      await api.darLance(id, centavos, token);
      setValor("");
      setMensagem("Lance registrado com sucesso.");
      void atualizar().catch(() => { /* A próxima atualização automática sincroniza a sala. */ });
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível registrar o lance.");
    } finally { setEnviando(false); }
  }

  if (carregando) {
    return <section className="painel" role="status">Carregando informações do lote...</section>;
  }

  if (!lote) {
    return (
      <section className="painel">
        <p className="mensagem mensagem-erro" role="alert">{erroConexao || "Lote não encontrado."}</p>
        <div className="d-flex gap-3 align-items-center mt-3">
          <button className="btn btn-outline-dark" type="button" onClick={() => {
            setCarregando(true);
            void atualizar()
              .catch((falha: unknown) => setErroConexao(falha instanceof Error ? falha.message : "Erro ao consultar lote."))
              .finally(() => setCarregando(false));
          }}>
            Tentar novamente
          </button>
          <Link className="link-acao" to="/">Voltar aos leilões</Link>
        </div>
      </section>
    );
  }

  const aberto = lote.situacao === "EM_ANDAMENTO" && new Date(lote.horarioFim).getTime() > agora;
  const jaLidera = minhaSituacao?.liderando === true;

  return (
    <article>
      <nav className="caminho-pagina" aria-label="Navegação estrutural"><Link to="/">Leilões</Link><span>/</span><span>Lote {lote.id.slice(0, 8)}</span></nav>
      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <img className="produto-grande" src={lote.item.imagem} alt={lote.item.titulo} />
          <section className="painel mt-3">
            <h2>Sobre o produto</h2>
            <p className="mb-0 text-secondary">{lote.item.descricao}</p>
          </section>
        </div>
        <div className="col-12 col-lg-7">
          <section className="painel sala-painel">
            <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
              <p className="sobretitulo mb-0">LOTE {lote.id.slice(0, 8)}</p>
              <span className={`estado estado-${lote.situacao}`}>{nomeSituacao(lote.situacao)}</span>
            </div>
            <h1 className="mb-0">{lote.item.titulo}</h1>
            <div className="sala-contador">
              <p className="label-secundario">{aberto ? "Tempo restante" : lote.situacao === "AGENDADO" ? "Início previsto" : "Encerrado em"}</p>
              <p className="contador-numero">{aberto ? contador(lote.horarioFim, agora) : dataHora(lote.situacao === "AGENDADO" ? lote.horarioInicio : lote.horarioFim)}</p>
              {aberto && <p className="small text-secondary mb-0">O horário pode ser prorrogado após lances nos últimos 2 minutos.</p>}
            </div>
            <div className="sala-resumo">
              <div><p className="label-secundario">Valor atual</p><strong>{moeda(lote.valorAtual)}</strong></div>
              <div><p className="label-secundario">Incremento mínimo</p><strong>{moeda(lote.incrementoMinimo)}</strong></div>
              <div><p className="label-secundario">Próximo lance</p><strong>{lote.proximoLanceMinimo === null ? "Indisponível" : moeda(lote.proximoLanceMinimo)}</strong></div>
            </div>

            {aberto && minhaSituacao?.liderando && <p className="mensagem mensagem-ok" role="status">Você está liderando este lote.</p>}
            {aberto && minhaSituacao?.participando && !minhaSituacao.liderando && <p className="mensagem mensagem-neutra" role="status">Você foi superado. Faça outro lance para voltar à disputa.</p>}
            {!aberto && minhaSituacao?.arrematado && <p className="mensagem mensagem-ok" role="status">Você arrematou este lote.</p>}

            {aberto && licitante && (
              <form className="bloco-oferta" onSubmit={(evento) => void ofertar(evento)}>
                <label htmlFor="valor" className="form-label">Seu lance (R$)</label>
                <div className="d-flex gap-2">
                  <input id="valor" className="form-control" type="text" inputMode="decimal"
                    placeholder={lote.proximoLanceMinimo === null ? "Valor" : (lote.proximoLanceMinimo / 100).toFixed(2).replace(".", ",")}
                    value={valor} onChange={(evento) => setValor(evento.target.value)} disabled={enviando || jaLidera} required />
                  <button type="submit" disabled={enviando || jaLidera || lote.proximoLanceMinimo === null} className="btn btn-principal flex-shrink-0">{enviando ? "Enviando..." : "Dar lance ↗"}</button>
                </div>
                {jaLidera && <p className="small text-secondary mt-2 mb-0">Você já possui o maior lance. Aguarde outra oferta.</p>}
              </form>
            )}
            {aberto && !sessao && <div className="bloco-oferta d-flex flex-wrap gap-3 align-items-center justify-content-between">
              <span className="small text-secondary">Entre na sua conta para ofertar.</span>
              <Link className="btn btn-principal" to="/login">Entrar para dar lance ↗</Link>
            </div>}
            {aberto && sessao?.usuario.papel === "LEILOEIRO" && <p className="mensagem mensagem-neutra">Somente licitantes podem ofertar neste lote.</p>}
            {!aberto && <p className="mensagem mensagem-neutra">Este lote não está recebendo novos lances.</p>}
            {erroConexao && <p className="mensagem mensagem-erro" role="alert">{erroConexao}</p>}
            {erro && <p className="mensagem mensagem-erro" role="alert">{erro}</p>}
            {mensagem && <p className="mensagem mensagem-ok" role="status">{mensagem}</p>}
          </section>
        </div>
      </div>
      <section className="painel mt-4">
        <div className="painel-cabecalho">
          <div><h2>Histórico de lances <span className="text-secondary">({lote.quantidadeLances})</span></h2><p className="small text-secondary mb-0 mt-1">Participantes identificados anonimamente.</p></div>
          <div className="d-flex gap-3 align-items-center flex-wrap">
            <Link className="link-acao" to={`/lotes/${lote.id}/auditoria`}>Ver auditoria pública ↗</Link>
            {lote.situacao === "ENCERRADO" && lote.quantidadeLances > 0 && <Link className="link-acao" to={`/lotes/${lote.id}/comprovante`}>Ver comprovante ↗</Link>}
          </div>
        </div>
        {lote.historico.length === 0 ? <p className="text-secondary mb-0">Ainda não há lances neste lote.</p> : (
          <div className="tabela-container table-responsive">
            <table className="table table-hover align-middle">
              <thead><tr><th>Sequência</th><th>Valor ofertado</th><th>Participante</th><th>Data e hora</th></tr></thead>
              <tbody>{[...lote.historico].reverse().map((lance) => (
                <tr key={lance.sequencia}><td className="numeros">#{lance.sequencia}</td><td className="fw-semibold numeros">{moeda(lance.valorMonetario)}</td><td>{lance.licitante}</td><td className="numeros">{dataHora(lance.realizadoEm)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </article>
  );
}
