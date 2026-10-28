import { db } from "./conexao.js";

import { LoteRepository } from "./repositories/loteRepository.js";
import { LanceRepository } from "./repositories/lanceRepository.js";
import { CarteiraRepository } from "./repositories/carteiraRepository.js";
import { UsuarioRepository } from "./repositories/usuarioRepository.js";
import { ComprovanteRepository } from "./repositories/comprovanteRepository.js";

export type Transacao = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function executarEmTransacao<T>(
  executar: (repositorios: {
    lotes: LoteRepository;
    lances: LanceRepository;
    carteiras: CarteiraRepository;
    usuarios: UsuarioRepository;
    comprovantes: ComprovanteRepository;
  }) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    return executar({
      lotes: new LoteRepository(tx),
      lances: new LanceRepository(tx),
      carteiras: new CarteiraRepository(tx),
      usuarios: new UsuarioRepository(tx),
      comprovantes: new ComprovanteRepository(tx),
    });
  });
}
