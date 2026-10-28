import { compare, hash, truncates } from "bcryptjs";

export class Senha {
  private constructor(
    private readonly senhaHash: string
  ) {}

  public static async criar(senha: string): Promise<Senha> {
    if (senha.trim().length === 0) {
      throw new Error("A senha é obrigatória.");
    }

    if (truncates(senha)) {
      throw new Error("A senha excede o tamanho permitido.");
    }

    const senhaHash = await hash(senha, 12);

    return new Senha(senhaHash);
  }

  public static restaurar(senhaHash: string): Senha {
    if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(senhaHash)) {
      throw new Error("O hash da senha é inválido.");
    }
    
    return new Senha(senhaHash);
  }

  public async validarSenha(senha: string): Promise<boolean> {
    return compare(senha, this.senhaHash);
  }

  public obterHash(): string {
    return this.senhaHash;
  }
}
