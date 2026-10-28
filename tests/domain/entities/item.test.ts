
import { describe, expect, it } from "vitest";
import { Item } from "../../../backend/src/domain/entities/item.js";

describe("Item", () => {
  type DadosItem = ConstructorParameters<typeof Item>[0];

  function criarItem(
    sobrescritas: Partial<DadosItem> = {}
  ): Item {
    return new Item({
      id: "item-001",
      titulo: "Notebook",
      descricao: "Notebook com 16GB de memória RAM.",
      imagem: "/uploads/notebook.jpg",
      ...sobrescritas,
    });
  }

  it("deve criar um item válido", () => {
    const item = criarItem();

    expect(item.obterId()).toBe("item-001");
    expect(item.obterTitulo()).toBe("Notebook");
    expect(item.obterDescricao()).toBe(
      "Notebook com 16GB de memória RAM."
    );
    expect(item.obterImagem()).toBe(
      "/uploads/notebook.jpg"
    );
  });

  it("deve remover espaços das extremidades", () => {
    const item = criarItem({
      titulo: "  Notebook  ",
      descricao: "  Notebook com 16GB de RAM.  ",
    });

    expect(item.obterTitulo()).toBe("Notebook");
    expect(item.obterDescricao()).toBe(
      "Notebook com 16GB de RAM."
    );
  });

  it.each([
    ["id", { id: " " }, "O identificador do item é obrigatório."],
    ["titulo", { titulo: "" }, "O título do item é obrigatório."],
    ["descricao", { descricao: " " }, "A descrição do item é obrigatória."],
    ["imagem", { imagem: "" }, "A imagem do item é obrigatória."],
  ] as const)(
    "deve rejeitar item com %s vazio",
    (_campo, dados, mensagem) => {
      expect(() => criarItem(dados)).toThrow(mensagem);
    }
  );
});
