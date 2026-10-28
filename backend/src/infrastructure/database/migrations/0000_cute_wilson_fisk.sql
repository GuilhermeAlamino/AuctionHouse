CREATE TYPE "public"."papel_usuario" AS ENUM('LEILOEIRO', 'LICITANTE');--> statement-breakpoint
CREATE TABLE "carteiras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"saldo_total" bigint DEFAULT 0 NOT NULL,
	"saldo_comprometido" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "carteiras_usuario_id_unique" UNIQUE("usuario_id"),
	CONSTRAINT "saldo_total_positivo" CHECK ("carteiras"."saldo_total" >= 0),
	CONSTRAINT "saldo_comprometido_valido" CHECK ("carteiras"."saldo_comprometido" >= 0
        AND "carteiras"."saldo_comprometido" <= "carteiras"."saldo_total")
);
--> statement-breakpoint
CREATE TABLE "comprovantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lote_id" uuid NOT NULL,
	"licitante_id" uuid NOT NULL,
	"lance_vencedor_id" uuid NOT NULL,
	CONSTRAINT "comprovantes_lote_id_unique" UNIQUE("lote_id"),
	CONSTRAINT "comprovantes_lance_vencedor_id_unique" UNIQUE("lance_vencedor_id")
);
--> statement-breakpoint
CREATE TABLE "itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" varchar(255) NOT NULL,
	"descricao" text NOT NULL,
	"imagem" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lote_id" uuid NOT NULL,
	"licitante_id" uuid NOT NULL,
	"valor_monetario" bigint NOT NULL,
	"sequencia" integer NOT NULL,
	"realizado_em" timestamp with time zone NOT NULL,
	CONSTRAINT "valor_lance_positivo" CHECK ("lances"."valor_monetario" > 0),
	CONSTRAINT "sequencia_lance_positiva" CHECK ("lances"."sequencia" > 0)
);
--> statement-breakpoint
CREATE TABLE "lotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leiloeiro_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"lance_inicial" bigint NOT NULL,
	"incremento_minimo" bigint NOT NULL,
	"horario_inicio" timestamp with time zone NOT NULL,
	"horario_fim" timestamp with time zone NOT NULL,
	"cancelado_em" timestamp with time zone,
	"prorrogado" boolean DEFAULT false NOT NULL,
	CONSTRAINT "periodo_lote_valido" CHECK ("lotes"."horario_inicio" < "lotes"."horario_fim"),
	CONSTRAINT "lance_inicial_positivo" CHECK ("lotes"."lance_inicial" > 0),
	CONSTRAINT "incremento_minimo_positivo" CHECK ("lotes"."incremento_minimo" > 0)
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" varchar(150) NOT NULL,
	"apelido" varchar(80) NOT NULL,
	"email" varchar(254) NOT NULL,
	"senha_hash" text NOT NULL,
	"papel_usuario" "papel_usuario" NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "carteiras" ADD CONSTRAINT "carteiras_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprovantes" ADD CONSTRAINT "comprovantes_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprovantes" ADD CONSTRAINT "comprovantes_licitante_id_usuarios_id_fk" FOREIGN KEY ("licitante_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprovantes" ADD CONSTRAINT "comprovantes_lance_vencedor_id_lances_id_fk" FOREIGN KEY ("lance_vencedor_id") REFERENCES "public"."lances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lances" ADD CONSTRAINT "lances_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lances" ADD CONSTRAINT "lances_licitante_id_usuarios_id_fk" FOREIGN KEY ("licitante_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_leiloeiro_id_usuarios_id_fk" FOREIGN KEY ("leiloeiro_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_item_id_itens_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."itens"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lance_sequencia_lote_idx" ON "lances" USING btree ("lote_id","sequencia");