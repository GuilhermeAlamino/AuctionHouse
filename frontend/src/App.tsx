import { useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router";

import { guardarSessao, obterSessao } from "./api/cliente";
import { Cabecalho } from "./components/Cabecalho";
import { Auditoria } from "./pages/Auditoria";
import { Carteira } from "./pages/Carteira";
import { Comprovante } from "./pages/Comprovante";
import { CriarLote } from "./pages/CriarLote";
import { Login } from "./pages/Login";
import { MeusLotes } from "./pages/MeusLotes";
import { MinhasParticipacoes } from "./pages/MinhasParticipacoes";
import { SalaLote } from "./pages/SalaLote";
import { Vitrine } from "./pages/Vitrine";
import type { Sessao } from "./types";

export function App() {
  const [sessao, setSessao] = useState<Sessao | null>(obterSessao);
  const navegar = useNavigate();

  function autenticar(novaSessao: Sessao) {
    guardarSessao(novaSessao);
    setSessao(novaSessao);
    navegar(novaSessao.usuario.papel === "LEILOEIRO" ? "/meus-lotes" : "/");
  }

  function sair() {
    guardarSessao(null);
    setSessao(null);
    navegar("/");
  }

  const licitante = sessao?.usuario.papel === "LICITANTE";
  const leiloeiro = sessao?.usuario.papel === "LEILOEIRO";

  return (
    <>
      <Cabecalho sessao={sessao} sair={sair} />

      <main className="container pagina py-4 py-md-5">
        <Routes>
          <Route path="/" element={<Vitrine />} />
          <Route
            path="/login"
            element={
              sessao ? <Navigate to="/" replace /> : <Login autenticar={autenticar} />
            }
          />
          <Route path="/lotes/:id" element={<SalaLote sessao={sessao} />} />
          <Route path="/lotes/:id/auditoria" element={<Auditoria />} />
          <Route path="/lotes/:id/comprovante" element={<Comprovante />} />

          <Route
            path="/meus-lotes"
            element={
              leiloeiro && sessao ? (
                <MeusLotes key={sessao.usuario.id} token={sessao.token} />
              ) : (
                <Navigate to={sessao ? "/" : "/login"} replace />
              )
            }
          />
          <Route
            path="/criar-lote"
            element={
              leiloeiro && sessao ? (
                <CriarLote key={sessao.usuario.id} token={sessao.token} />
              ) : (
                <Navigate to={sessao ? "/" : "/login"} replace />
              )
            }
          />
          <Route
            path="/carteira"
            element={
              licitante && sessao ? (
                <Carteira key={sessao.usuario.id} token={sessao.token} />
              ) : (
                <Navigate to={sessao ? "/" : "/login"} replace />
              )
            }
          />
          <Route
            path="/minhas-participacoes"
            element={
              licitante && sessao ? (
                <MinhasParticipacoes key={sessao.usuario.id} token={sessao.token} />
              ) : (
                <Navigate to={sessao ? "/" : "/login"} replace />
              )
            }
          />
          <Route
            path="/participacoes"
            element={<Navigate to="/minhas-participacoes" replace />}
          />
          <Route
            path="*"
            element={
              <section>
                <h1>Página não encontrada</h1>
                <p>
                  <a href="/">Voltar aos leilões</a>
                </p>
              </section>
            }
          />
        </Routes>
      </main>
    </>
  );
}
