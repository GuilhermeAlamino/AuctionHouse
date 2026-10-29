import "dotenv/config";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import express from "express";
import { pool } from "./src/infrastructure/database/conexao.js";

import { iniciarProcessamentoLotes } from "./src/infrastructure/jobs/iniciarProcessamentoLotes.js";
import { authRoutes } from "./src/http/routes/authRoutes.js";
import { loteRoutes } from "./src/http/routes/loteRoutes.js";
import { produtoRoutes } from "./src/http/routes/produtoRoutes.js";
import { carteiraRoutes } from "./src/http/routes/carteiraRoutes.js";
import { licitanteRoutes } from "./src/http/routes/licitanteRoutes.js";
import { leiloeiroRoutes } from "./src/http/routes/leiloeiroRoutes.js";

const app = express();

app.set("trust proxy", 1);

const PORT = Number(process.env.PORT ?? 3001);

app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "error" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/lotes", loteRoutes);
app.use("/api/produtos", produtoRoutes);
app.use("/api/carteira", carteiraRoutes);
app.use("/api/licitante", licitanteRoutes);
app.use("/api/leiloeiro", leiloeiroRoutes);

app.use("/api", (_req, res) => {
  res.status(404).json({ erro: "Endpoint não encontrado." });
});

// No desenvolvimento o Vite serve o React na porta 5173.
// No Docker/produção, o mesmo Express entrega o build do React e a API.
if (process.env.NODE_ENV === "production") {
  const pastaFrontend = resolve("dist/frontend");
  const indexHtml = join(pastaFrontend, "index.html");

  if (!existsSync(indexHtml)) {
    throw new Error("Frontend não compilado. Execute npm run build.");
  }

  app.use(express.static(pastaFrontend));
  app.get("*", (_req, res) => res.sendFile(indexHtml));
}

app.listen(PORT, () => {
  console.log(`API disponível em http://localhost:${PORT}`);
  iniciarProcessamentoLotes();
});
