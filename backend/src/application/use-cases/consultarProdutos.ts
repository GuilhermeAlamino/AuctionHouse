type ProdutoExterno = {
  id: number;
  title: string;
  description: string;
  thumbnail: string;
};

function produtoValido(valor: unknown): valor is ProdutoExterno {
  if (!valor || typeof valor !== "object") {
    return false;
  }

  const produto = valor as Record<string, unknown>;

  return (
    Number.isSafeInteger(produto.id) &&
    typeof produto.title === "string" &&
    typeof produto.description === "string" &&
    typeof produto.thumbnail === "string"
  );
}

export async function consultarProdutos(busca = "") {
  const termo = busca.trim();

  const url = new URL(
    termo
      ? "https://dummyjson.com/products/search"
      : "https://dummyjson.com/products"
  );

  if (termo) {
    url.searchParams.set("q", termo);
  } else {
    url.searchParams.set("limit", "24");
  }

  const resposta = await fetch(url, {
    signal: AbortSignal.timeout(8000),
  });

  if (!resposta.ok) {
    throw new Error("Catálogo de produtos indisponível.");
  }

  const dados: unknown = await resposta.json();

  if (
    !dados ||
    typeof dados !== "object" ||
    !("products" in dados) ||
    !Array.isArray(dados.products)
  ) {
    throw new Error("Resposta do catálogo inválida.");
  }

  return dados.products
    .filter(produtoValido)
    .map((produto) => ({
      id: produto.id,
      titulo: produto.title,
      descricao: produto.description,
      imagem: produto.thumbnail,
    }));
}
