export type TipoEventoLote =
  | "LANCE_REGISTRADO"
  | "LOTE_ENCERRADO"
  | "LOTE_LIQUIDADO"
  | "LOTE_CANCELADO";

type Ouvinte = (tipo: TipoEventoLote) => void;

const ouvintesPorLote = new Map<string, Set<Ouvinte>>();

export function assinarEventosLote(loteId: string, ouvinte: Ouvinte): () => void {
  let ouvintes = ouvintesPorLote.get(loteId);

  if (!ouvintes) {
    ouvintes = new Set();
    ouvintesPorLote.set(loteId, ouvintes);
  }

  ouvintes.add(ouvinte);

  return () => {
    ouvintes.delete(ouvinte);

    if (ouvintes.size === 0) {
      ouvintesPorLote.delete(loteId);
    }
  };
}

export function publicarEventoLote(loteId: string, tipo: TipoEventoLote): void {
  for (const ouvinte of ouvintesPorLote.get(loteId) ?? []) {
    try {
      ouvinte(tipo);
    } catch (erro) {
      console.error(`Falha ao enviar evento do lote ${loteId}:`, erro);
    }
  }
}
