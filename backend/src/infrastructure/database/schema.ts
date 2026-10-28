import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  bigint,
  integer,
  boolean,
  timestamp,
  check,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const papelUsuarioEnum = pgEnum("papel_usuario", [
  "LEILOEIRO",
  "LICITANTE",
]);

export const usuarios = pgTable("usuarios", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: varchar("nome", { length: 150 }).notNull(),
  apelido: varchar("apelido", { length: 80 }).notNull(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  papelUsuario: papelUsuarioEnum("papel_usuario").notNull(),
});

export const itens = pgTable("itens", {
  id: uuid("id").defaultRandom().primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descricao: text("descricao").notNull(),
  imagem: text("imagem").notNull(),
});

export const carteiras = pgTable(
  "carteiras",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .unique()
      .references(() => usuarios.id),

    saldoTotal: bigint("saldo_total", {
      mode: "number",
    })
      .notNull()
      .default(0),

    saldoComprometido: bigint("saldo_comprometido", {
      mode: "number",
    })
      .notNull()
      .default(0),
  },
  (t) => [
    check("saldo_total_positivo", sql`${t.saldoTotal} >= 0`),
    check(
      "saldo_comprometido_valido",
      sql`${t.saldoComprometido} >= 0
        AND ${t.saldoComprometido} <= ${t.saldoTotal}`
    ),
  ]
);

export const lotes = pgTable(
  "lotes",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    leiloeiroId: uuid("leiloeiro_id")
      .notNull()
      .references(() => usuarios.id),

    itemId: uuid("item_id")
      .notNull()
      .references(() => itens.id),

    lanceInicial: bigint("lance_inicial", {
      mode: "number",
    }).notNull(),

    incrementoMinimo: bigint("incremento_minimo", {
      mode: "number",
    }).notNull(),

    horarioInicio: timestamp("horario_inicio", {
      withTimezone: true,
      mode: "date",
    }).notNull(),

    horarioFim: timestamp("horario_fim", {
      withTimezone: true,
      mode: "date",
    }).notNull(),

    canceladoEm: timestamp("cancelado_em", {
      withTimezone: true,
      mode: "date",
    }),

    prorrogado: boolean("prorrogado").notNull().default(false),

    encerradoEm: timestamp("encerrado_em", {
      withTimezone: true,
      mode: "date",
    }),
  },
  (t) => [
    check("periodo_lote_valido", sql`${t.horarioInicio} < ${t.horarioFim}`),
    check("lance_inicial_positivo", sql`${t.lanceInicial} > 0`),
    check("incremento_minimo_positivo", sql`${t.incrementoMinimo} > 0`),
  ]
);

export const lances = pgTable(
  "lances",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    loteId: uuid("lote_id")
      .notNull()
      .references(() => lotes.id),

    licitanteId: uuid("licitante_id")
      .notNull()
      .references(() => usuarios.id),

    valorMonetario: bigint("valor_monetario", {
      mode: "number",
    }).notNull(),

    sequencia: integer("sequencia").notNull(),

    realizadoEm: timestamp("realizado_em", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => [
    uniqueIndex("lance_sequencia_lote_idx").on(t.loteId, t.sequencia),

    check("valor_lance_positivo", sql`${t.valorMonetario} > 0`),
    check("sequencia_lance_positiva", sql`${t.sequencia} > 0`),
  ]
);

export const comprovantes = pgTable("comprovantes", {
  id: uuid("id").defaultRandom().primaryKey(),

  loteId: uuid("lote_id")
    .notNull()
    .unique()
    .references(() => lotes.id),

  licitanteId: uuid("licitante_id")
    .notNull()
    .references(() => usuarios.id),

  lanceVencedorId: uuid("lance_vencedor_id")
    .notNull()
    .unique()
    .references(() => lances.id),
});
