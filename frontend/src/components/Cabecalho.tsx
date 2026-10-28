import { NavLink } from "react-router";
import type { Sessao } from "../types.js";

type Props = { sessao: Sessao | null; sair: () => void };

export function Cabecalho({ sessao, sair }: Props) {
  const usuario = sessao?.usuario;
  const nome = usuario?.nome || usuario?.apelido || "Usuário";
  const papel = usuario?.papel === "LEILOEIRO" ? "Leiloeiro" : "Licitante";
  const inicial = nome.trim().charAt(0).toUpperCase();

  return (
    <header className="cabecalho">
      <nav className="container cabecalho-estrutura" aria-label="Navegação principal">
        <NavLink to="/" className="marca" aria-label="Casa de Leilões, página inicial">
          <span className="marca-simbolo" aria-hidden="true">CL</span>
          <span>Casa de Leilões<span className="marca-ponto">.</span></span>
        </NavLink>

        <div className="navegacao" aria-label="Seções da plataforma">
          <NavLink to="/" end>Leilões</NavLink>
          {usuario?.papel === "LEILOEIRO" && (
            <>
              <NavLink to="/meus-lotes">Meus lotes</NavLink>
              <NavLink to="/criar-lote">Criar lote</NavLink>
            </>
          )}
          {usuario?.papel === "LICITANTE" && (
            <>
              <NavLink to="/carteira">Carteira</NavLink>
              <NavLink to="/minhas-participacoes">Minhas participações</NavLink>
            </>
          )}
        </div>

        <div className="cabecalho-conta">
          {usuario ? (
            <>
              <div className="usuario-identificacao" title={`${nome} · ${papel}`}>
                <span className="usuario-avatar" aria-hidden="true">{inicial}</span>
                <span className="usuario-texto">
                  <strong>{nome}</strong>
                  <small>{papel}</small>
                </span>
              </div>
              <button className="botao-sair" onClick={sair} type="button">Sair</button>
            </>
          ) : (
            <NavLink className="btn btn-principal btn-sm cabecalho-entrar" to="/login">Entrar na conta <span aria-hidden="true">↗</span></NavLink>
          )}
        </div>
      </nav>
    </header>
  );
}
