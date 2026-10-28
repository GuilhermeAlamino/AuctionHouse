import type { RequestHandler } from "express";

import {
  verificarToken,
  type Papel,
  type Sessao,
} from "../jwt.js";

export function autenticar(
  papelExigido?: Papel
): RequestHandler {
  return (req, res, next) => {
    const autorizacao = req.headers.authorization;

    if (!autorizacao?.startsWith("Bearer ")) {
      res.status(401).json({
        erro: "Autenticação necessária.",
      });
      return;
    }

    try {
      const token = autorizacao.slice(7);
      const sessao: Sessao = verificarToken(token);

      if (
        papelExigido &&
        sessao.papel !== papelExigido
      ) {
        res.status(403).json({
          erro: "Acesso não permitido.",
        });
        return;
      }

      res.locals.sessao = sessao;

      next();
    } catch {
      res.status(401).json({
        erro: "Token inválido ou expirado.",
      });
    }
  };
}
