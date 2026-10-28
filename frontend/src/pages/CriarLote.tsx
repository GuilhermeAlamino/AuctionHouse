import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api } from "../api/endpoints";
import { reaisParaCentavos } from "../formatacao";
import type { Produto } from "../types";

export function CriarLote({ token }: { token: string }) {
  const navegar = useNavigate();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [produtoId, setProdutoId] = useState("");
  const [lanceInicial, setLanceInicial] = useState("");
  const [incrementoMinimo, setIncrementoMinimo] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [erro, setErro] = useState("");
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(true);
  const [criando, setCriando] = useState(false);
  const [tentativaCatalogo, setTentativaCatalogo] = useState(0);

  useEffect(() => {
    let ativo = true;
    void api.produtos(token)
      .then((dados) => { if (ativo) { setProdutos(dados); setErro(""); } })
      .catch((falha: unknown) => { if (ativo) setErro(falha instanceof Error ? falha.message : "Catálogo indisponível."); })
      .finally(() => { if (ativo) setCarregandoCatalogo(false); });
    return () => { ativo = false; };
  }, [token, tentativaCatalogo]);

  const produto = produtos.find((item) => String(item.id) === produtoId);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const inicial = reaisParaCentavos(lanceInicial);
    const incremento = reaisParaCentavos(incrementoMinimo);
    const inicioData = new Date(inicio);
    const fimData = new Date(fim);
    if (!produto || !inicial || !incremento || !Number.isFinite(inicioData.getTime()) ||
        !Number.isFinite(fimData.getTime()) || inicioData >= fimData || fimData.getTime() <= Date.now()) {
      setErro("Selecione um produto e informe valores e datas válidos.");
      return;
    }
    setErro("");
    setCriando(true);
    try {
      const resultado = await api.criarLote(token, {
        produtoId: produto.id,
        lanceInicial: inicial,
        incrementoMinimo: incremento,
        horarioInicio: inicioData.toISOString(),
        horarioFim: fimData.toISOString(),
      });
      navegar(`/lotes/${resultado.id}`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível criar o lote.");
    } finally { setCriando(false); }
  }

  return (
    <section>
      <div className="caminho-pagina"><Link to="/meus-lotes">Meus lotes</Link><span>/</span><span>Novo lote</span></div>
      <div className="cabecalho-pagina">
        <div><p className="sobretitulo">GESTÃO DE LEILÕES</p><h1>Criar lote</h1>
          <p className="subtitulo-pagina">Selecione um produto e defina as condições da disputa.</p></div>
      </div>
      <div className="painel formulario-lote">
        <form onSubmit={(evento) => void salvar(evento)}>
          <div className="painel-cabecalho"><h2>01 <span className="text-secondary ms-2">Produto</span></h2></div>
          <div className="mb-4">
            <label htmlFor="produto" className="form-label">Selecionar no catálogo externo</label>
            <select id="produto" className="form-select" value={produtoId} onChange={(evento) => setProdutoId(evento.target.value)} required disabled={carregandoCatalogo}>
              <option value="">{carregandoCatalogo ? "Carregando catálogo..." : "Selecione um produto"}</option>
              {produtos.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}
            </select>
            {erro && produtos.length === 0 && (
              <div className="mensagem mensagem-erro" role="alert">
                <p className="mb-2">{erro}</p>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-dark"
                  onClick={() => {
                    setErro("");
                    setCarregandoCatalogo(true);
                    setTentativaCatalogo((atual) => atual + 1);
                  }}
                >
                  Tentar novamente
                </button>
              </div>
            )}
            {produto && (
              <div className="produto-selecionado">
                <img src={produto.imagem} alt="" />
                <div><p className="label-secundario">Produto selecionado</p><strong>{produto.titulo}</strong></div>
              </div>
            )}
          </div>

          <div className="painel-cabecalho mt-4"><h2>02 <span className="text-secondary ms-2">Condições de lance</span></h2></div>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6"><label htmlFor="inicial" className="form-label">Lance inicial (R$)</label><input id="inicial" type="text" inputMode="decimal" placeholder="0,00" className="form-control" value={lanceInicial} onChange={(evento) => setLanceInicial(evento.target.value)} required /></div>
            <div className="col-12 col-md-6"><label htmlFor="incremento" className="form-label">Incremento mínimo (R$)</label><input id="incremento" type="text" inputMode="decimal" placeholder="0,00" className="form-control" value={incrementoMinimo} onChange={(evento) => setIncrementoMinimo(evento.target.value)} required /></div>
          </div>

          <div className="painel-cabecalho"><h2>03 <span className="text-secondary ms-2">Período</span></h2></div>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6"><label htmlFor="inicio" className="form-label">Início do leilão</label><input id="inicio" type="datetime-local" className="form-control" value={inicio} onChange={(evento) => setInicio(evento.target.value)} required /></div>
            <div className="col-12 col-md-6"><label htmlFor="fim" className="form-label">Encerramento</label><input id="fim" type="datetime-local" className="form-control" value={fim} onChange={(evento) => setFim(evento.target.value)} required /></div>
          </div>
          <p className="small text-secondary mb-0">O lote ficará disponível na vitrine após sua criação.</p>
          {erro && produtos.length > 0 && (
            <p className="mensagem mensagem-erro" role="alert">{erro}</p>
          )}
          <div className="d-flex flex-wrap justify-content-end gap-2 mt-4 pt-3 borda-separadora">
            <Link className="btn btn-outline-secondary" to="/meus-lotes">Voltar</Link>
            <button type="submit" disabled={criando || produtos.length === 0} className="btn btn-principal">{criando ? "Criando lote..." : "Criar lote ↗"}</button>
          </div>
        </form>
      </div>
    </section>
  );
}
