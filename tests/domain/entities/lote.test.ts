import { describe, expect, it, vi } from "vitest";

import { Item } from "../../../backend/src/domain/entities/item.js";
import { Lote } from "../../../backend/src/domain/entities/lote.js";
import { SituacaoLote } from "../../../backend/src/domain/enums/situacaoLote.js";
import { Lance } from "../../../backend/src/domain/entities/lance.js";

describe("Lote", () => {
  const item = new Item({
    id: "item-001",
    titulo: "Notebook",
    descricao: "Notebook com 16GB de RAM.",
    imagem: "/uploads/notebook.jpg",
  });

  const agora = new Date("2026-10-27T18:30:00Z");

  function criarLote(
    sobrescritas: Partial<ConstructorParameters<typeof Lote>[0]> = {}
  ): Lote {
    return new Lote({
      id: "lote-001",
      leiloeiroId: "usuario-001",
      item,
      lanceInicial: 10000,
      incrementoMinimo: 1000,
      horarioInicio: new Date("2026-10-27T18:00:00Z"),
      horarioFim: new Date("2026-10-27T19:00:00Z"),
      canceladoEm: null,
      prorrogado: false,
      ...sobrescritas,
    });
  }

  function criarLanceLider(): Lance {
    return new Lance({
      id: "lance-001",
      loteId: "lote-001",
      licitanteId: "usuario-001",
      valorMonetario: 10000,
      realizadoEm: agora,
    });
  }

  it("deve aceitar o primeiro lance igual ao valor inicial", () => {
    const lote = criarLote();

    expect(() =>
      lote.validarOferta("usuario-001", 10000, null, agora)
    ).not.toThrow();
  });

  it("deve rejeitar o primeiro lance abaixo do valor inicial", () => {
    const lote = criarLote();

    expect(() => lote.validarOferta("usuario-001", 9000, null, agora)).toThrow(
      "O lance está abaixo do valor mínimo permitido."
    );
  });

  it("deve aceitar um lance respeitando o incremento mínimo", () => {
    const lote = criarLote();

    expect(() =>
      lote.validarOferta("usuario-002", 11000, criarLanceLider(), agora)
    ).not.toThrow();
  });

  it("deve rejeitar um lance abaixo do incremento mínimo", () => {
    const lote = criarLote();

    expect(() =>
      lote.validarOferta("usuario-002", 10500, criarLanceLider(), agora)
    ).toThrow("O lance está abaixo do valor mínimo permitido.");
  });

  it("não deve permitir que o líder supere o próprio lance", () => {
    const lote = criarLote();

    expect(() =>
      lote.validarOferta("usuario-001", 11000, criarLanceLider(), agora)
    ).toThrow("Você já está liderando este lote.");
  });

  it("não deve aceitar lances após o encerramento", () => {
    const lote = criarLote();

    expect(() =>
      lote.validarOferta(
        "usuario-001",
        10000,
        null,
        new Date("2026-10-27T19:00:00Z")
      )
    ).toThrow("O lote não está em andamento.");
  });

  it("deve criar um lote válido", () => {
    const lote = criarLote();

    expect(lote.obterId()).toBe("lote-001");
    expect(lote.obterLeiloeiroId()).toBe("usuario-001");
    expect(lote.obterItem()).toBe(item);
    expect(lote.obterLanceInicial()).toBe(10000);
    expect(lote.obterIncrementoMinimo()).toBe(1000);
  });

  it("deve identificar um lote agendado", () => {
    const lote = criarLote();

    expect(lote.obterSituacao(new Date("2026-10-27T17:59:00Z"))).toBe(
      SituacaoLote.AGENDADO
    );
  });

  it("deve identificar um lote em andamento", () => {
    const lote = criarLote();

    expect(lote.obterSituacao(new Date("2026-10-27T18:30:00Z"))).toBe(
      SituacaoLote.EM_ANDAMENTO
    );
  });

  it("deve identificar um lote encerrado", () => {
    const lote = criarLote();

    expect(lote.obterSituacao(new Date("2026-10-27T19:00:00Z"))).toBe(
      SituacaoLote.ENCERRADO
    );
  });

  it("deve permitir cancelar um lote sem lances", () => {
    const lote = criarLote();
    const agora = new Date("2026-10-27T18:10:00Z");

    lote.cancelar(false, agora);

    expect(lote.obterSituacao(agora)).toBe(SituacaoLote.CANCELADO);
    expect(lote.obterCanceladoEm()).toEqual(agora);
  });

  it("não deve permitir cancelar um lote com lances", () => {
    const lote = criarLote();

    expect(() => lote.cancelar(true, agora)).toThrow(
      "Não é possível cancelar um lote que possui lances."
    );
  });

  it("não deve permitir cancelar duas vezes", () => {
    const lote = criarLote();

    lote.cancelar(false, agora);

    expect(() => lote.cancelar(false, agora)).toThrow(
      "O lote já está cancelado."
    );
  });

  it("deve prorrogar dois minutos nos instantes finais", () => {
    const lote = criarLote();

    const prorrogou = lote.prorrogarFim(new Date("2026-10-27T18:59:00Z"));

    expect(prorrogou).toBe(true);
    expect(lote.obterHorarioFim()).toEqual(new Date("2026-10-27T19:02:00Z"));
  });

  it("não deve prorrogar mais de uma vez", () => {
    const lote = criarLote();

    lote.prorrogarFim(new Date("2026-10-27T18:59:00Z"));

    const prorrogou = lote.prorrogarFim(new Date("2026-10-27T19:01:00Z"));

    expect(prorrogou).toBe(false);
    expect(lote.obterHorarioFim()).toEqual(new Date("2026-10-27T19:02:00Z"));
  });

  it("não deve prorrogar antes dos últimos dois minutos", () => {
    const lote = criarLote();

    expect(lote.prorrogarFim(new Date("2026-10-27T18:30:00Z"))).toBe(false);
  });

  it("não deve prorrogar um lote encerrado", () => {
    const lote = criarLote();

    expect(lote.prorrogarFim(new Date("2026-10-27T19:00:00Z"))).toBe(false);
  });

  it("não deve permitir alterar o período por uma referência externa", () => {
    const lote = criarLote();
    const horarioFim = lote.obterHorarioFim();

    horarioFim.setFullYear(2030);

    expect(lote.obterHorarioFim()).toEqual(new Date("2026-10-27T19:00:00Z"));
  });

  it.each([
    [{ lanceInicial: 0 }, "O lance inicial deve ser maior que zero."],
    [{ incrementoMinimo: -1 }, "O incremento mínimo deve ser maior que zero."],
    [
      {
        horarioInicio: new Date("2026-10-27T20:00:00Z"),
      },
      "O período do lote é inválido.",
    ],
  ])("deve rejeitar dados inválidos", (dados, mensagem) => {
    expect(() => criarLote(dados)).toThrow(mensagem);
  });

  it("não deve permitir identificador do lote vazio", () => {
    expect(() => criarLote({ id: "   " })).toThrow(
      "O identificador do lote é obrigatório."
    );
  });

  it("não deve permitir identificador do leiloeiro vazio", () => {
    expect(() => criarLote({ leiloeiroId: "   " })).toThrow(
      "O leiloeiro é obrigatório."
    );
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "não deve aceitar lance inicial inválido: %s",
    (valor) => {
      expect(() => criarLote({ lanceInicial: valor })).toThrow(
        "O lance inicial deve ser maior que zero."
      );
    }
  );

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "não deve aceitar incremento mínimo inválido: %s",
    (valor) => {
      expect(() => criarLote({ incrementoMinimo: valor })).toThrow(
        "O incremento mínimo deve ser maior que zero."
      );
    }
  );

  it("não deve aceitar data de início inválida", () => {
    expect(() =>
      criarLote({ horarioInicio: new Date("inválida") })
    ).toThrow("O período do lote é inválido.");
  });

  it("não deve aceitar data de encerramento inválida", () => {
    expect(() =>
      criarLote({ horarioFim: new Date("inválida") })
    ).toThrow("O período do lote é inválido.");
  });

  it("não deve aceitar início e fim no mesmo instante", () => {
    expect(() =>
      criarLote({ horarioFim: new Date("2026-10-27T18:00:00Z") })
    ).toThrow("O período do lote é inválido.");
  });

  it("deve preservar as datas originais fornecidas ao construtor", () => {
    const inicio = new Date("2026-10-27T18:00:00Z");
    const fim = new Date("2026-10-27T19:00:00Z");
    const lote = criarLote({ horarioInicio: inicio, horarioFim: fim });

    inicio.setFullYear(2030);
    fim.setFullYear(2030);

    expect(lote.obterHorarioInicio()).toEqual(
      new Date("2026-10-27T18:00:00Z")
    );
    expect(lote.obterHorarioFim()).toEqual(
      new Date("2026-10-27T19:00:00Z")
    );
  });

  it("não deve permitir alterar a data de início por referência externa", () => {
    const lote = criarLote();
    const horarioInicio = lote.obterHorarioInicio();

    horarioInicio.setFullYear(2030);

    expect(lote.obterHorarioInicio()).toEqual(
      new Date("2026-10-27T18:00:00Z")
    );
  });

  it("não deve permitir alterar a data de cancelamento por referência externa", () => {
    const lote = criarLote();
    lote.cancelar(false, agora);

    const canceladoEm = lote.obterCanceladoEm()!;
    canceladoEm.setFullYear(2030);

    expect(lote.obterCanceladoEm()).toEqual(agora);
  });

  it("deve retornar null para o cancelamento de um lote ativo", () => {
    const lote = criarLote();

    expect(lote.obterCanceladoEm()).toBeNull();
  });

  it("deve restaurar um lote já cancelado", () => {
    const canceladoEm = new Date("2026-10-27T18:10:00Z");
    const lote = criarLote({ canceladoEm });

    canceladoEm.setFullYear(2030);

    expect(lote.obterSituacao(agora)).toBe(SituacaoLote.CANCELADO);
    expect(lote.obterCanceladoEm()).toEqual(
      new Date("2026-10-27T18:10:00Z")
    );
  });

  it("deve encerrar um lote quando o horário chega ao fim", () => {
    const lote = criarLote();
    const horario = new Date("2026-10-27T19:00:00Z");

    expect(lote.encerrar(horario)).toBe(true);
    expect(lote.obterEncerradoEm()).toEqual(horario);
    expect(lote.obterSituacao(horario)).toBe(SituacaoLote.ENCERRADO);
  });

  it("não deve encerrar antes do horário previsto", () => {
    const lote = criarLote();

    expect(() => lote.encerrar(agora)).toThrow(
      "O lote ainda não atingiu o encerramento."
    );
  });

  it("não deve encerrar um lote cancelado", () => {
    const lote = criarLote();
    lote.cancelar(false, agora);

    expect(() =>
      lote.encerrar(new Date("2026-10-27T19:00:00Z"))
    ).toThrow("Não é possível encerrar um lote cancelado.");
  });

  it("não deve encerrar duas vezes nem modificar a data original", () => {
    const lote = criarLote();
    const primeiraData = new Date("2026-10-27T19:00:00Z");

    expect(lote.encerrar(primeiraData)).toBe(true);
    expect(lote.encerrar(new Date("2026-10-27T19:01:00Z"))).toBe(false);
    expect(lote.obterEncerradoEm()).toEqual(primeiraData);
  });

  it("deve retornar null quando o lote ainda não foi encerrado", () => {
    expect(criarLote().obterEncerradoEm()).toBeNull();
  });

  it("deve restaurar um lote previamente encerrado", () => {
    const encerradoEm = new Date("2026-10-27T19:01:00Z");
    const lote = criarLote({ encerradoEm });

    encerradoEm.setFullYear(2030);

    expect(lote.obterEncerradoEm()).toEqual(
      new Date("2026-10-27T19:01:00Z")
    );
    expect(lote.encerrar(new Date("2026-10-27T19:02:00Z"))).toBe(false);
  });

  it("não deve permitir alterar a data de encerramento por referência externa", () => {
    const lote = criarLote();
    lote.encerrar(new Date("2026-10-27T19:00:00Z"));

    const encerradoEm = lote.obterEncerradoEm()!;
    encerradoEm.setFullYear(2030);

    expect(lote.obterEncerradoEm()).toEqual(
      new Date("2026-10-27T19:00:00Z")
    );
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "não deve aceitar lance com valor inválido: %s",
    (valor) => {
      const lote = criarLote();

      expect(() =>
        lote.validarOferta("usuario-002", valor, null, agora)
      ).toThrow("O valor do lance é inválido.");
    }
  );

  it("não deve aceitar um lance líder pertencente a outro lote", () => {
    const lote = criarLote();
    const liderDeOutroLote = new Lance({
      id: "lance-externo",
      loteId: "lote-002",
      licitanteId: "usuario-003",
      valorMonetario: 10000,
      realizadoEm: agora,
    });

    expect(() =>
      lote.validarOferta("usuario-002", 11000, liderDeOutroLote, agora)
    ).toThrow("O lance líder não pertence ao lote.");
  });

  it("deve aceitar oferta maior que o mínimo permitido", () => {
    const lote = criarLote();

    expect(() =>
      lote.validarOferta("usuario-002", 12000, criarLanceLider(), agora)
    ).not.toThrow();
  });

  it("não deve aceitar oferta quando o incremento ultrapassa inteiro seguro", () => {
    const lote = criarLote();
    const liderNoLimite = new Lance({
      id: "lance-limite",
      loteId: "lote-001",
      licitanteId: "usuario-001",
      valorMonetario: Number.MAX_SAFE_INTEGER,
      realizadoEm: agora,
    });

    expect(() =>
      lote.validarOferta(
        "usuario-002",
        Number.MAX_SAFE_INTEGER,
        liderNoLimite,
        agora
      )
    ).toThrow("O lance está abaixo do valor mínimo permitido.");
  });

  it("não deve aceitar lance antes do início do leilão", () => {
    const lote = criarLote();

    expect(() =>
      lote.validarOferta(
        "usuario-002",
        10000,
        null,
        new Date("2026-10-27T17:59:00Z")
      )
    ).toThrow("O lote não está em andamento.");
  });

  it("não deve aceitar lance em lote cancelado", () => {
    const lote = criarLote();
    lote.cancelar(false, agora);

    expect(() =>
      lote.validarOferta("usuario-002", 10000, null, agora)
    ).toThrow("O lote não está em andamento.");
  });

  it("não deve permitir cancelar lote encerrado", () => {
    const lote = criarLote();

    expect(() =>
      lote.cancelar(false, new Date("2026-10-27T19:00:00Z"))
    ).toThrow("Não é possível cancelar um lote encerrado.");
  });

  it("deve permitir cancelar um lote ainda agendado", () => {
    const lote = criarLote();
    const antesDoInicio = new Date("2026-10-27T17:59:00Z");

    lote.cancelar(false, antesDoInicio);

    expect(lote.obterSituacao(antesDoInicio)).toBe(SituacaoLote.CANCELADO);
  });

  it("não deve prorrogar um lote agendado", () => {
    const lote = criarLote();

    expect(
      lote.prorrogarFim(new Date("2026-10-27T17:59:00Z"))
    ).toBe(false);
  });

  it("não deve prorrogar um lote cancelado", () => {
    const lote = criarLote();
    lote.cancelar(false, agora);

    expect(lote.prorrogarFim(agora)).toBe(false);
  });

  it("deve prorrogar exatamente no início da janela de dois minutos", () => {
    const lote = criarLote();

    expect(lote.prorrogarFim(new Date("2026-10-27T18:58:00Z"))).toBe(true);
    expect(lote.obterHorarioFim()).toEqual(new Date("2026-10-27T19:02:00Z"));
  });

  it("deve restaurar um lote previamente prorrogado", () => {
    const lote = criarLote({ prorrogado: true });

    expect(lote.prorrogarFim(new Date("2026-10-27T18:59:00Z"))).toBe(false);
    expect(lote.obterHorarioFim()).toEqual(new Date("2026-10-27T19:00:00Z"));
  });

  it("deve usar o horário atual quando a data não é informada", () => {
    // Valida os argumentos padrão sem depender do relógio real do computador.
    vi.useFakeTimers();

    try {
      vi.setSystemTime(new Date("2026-10-27T18:30:00Z"));
      const lote = criarLote();

      expect(lote.obterSituacao()).toBe(SituacaoLote.EM_ANDAMENTO);
      expect(() =>
        lote.validarOferta("usuario-002", 10000, null)
      ).not.toThrow();
      expect(lote.prorrogarFim()).toBe(false);

      const loteParaCancelar = criarLote();
      loteParaCancelar.cancelar(false);
      expect(loteParaCancelar.obterSituacao()).toBe(SituacaoLote.CANCELADO);

      vi.setSystemTime(new Date("2026-10-27T19:00:00Z"));
      expect(lote.encerrar()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

});
