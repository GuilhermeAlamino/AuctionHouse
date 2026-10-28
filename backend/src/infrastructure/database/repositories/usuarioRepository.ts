import { eq } from "drizzle-orm";

import type { Transacao } from "../transacao.js";
import { usuarios } from "../schema.js";

export class UsuarioRepository {
  constructor(private readonly tx: Transacao) {}

  public async buscarPapel(
    id: string
  ): Promise<"LEILOEIRO" | "LICITANTE" | null> {
    const [registro] = await this.tx
      .select({ papelUsuario: usuarios.papelUsuario })
      .from(usuarios)
      .where(eq(usuarios.id, id));

    return registro?.papelUsuario ?? null;
  }

  public async buscarCredenciaisPorEmail(email: string) {
    const [usuario] = await this.tx
      .select({
        id: usuarios.id,
        nome: usuarios.nome,
        apelido: usuarios.apelido,
        senhaHash: usuarios.senhaHash,
        papel: usuarios.papelUsuario,
      })
      .from(usuarios)
      .where(eq(usuarios.email, email))
      .limit(1);

    return usuario ?? null;
  }
}
