-- Consolidate fontesReferencia, edicoesFonte, proveniencia into single fontes Json array.

ALTER TABLE "MedicinaNaturalItem" DROP COLUMN IF EXISTS "fontesReferencia";
ALTER TABLE "MedicinaNaturalItem" DROP COLUMN IF EXISTS "edicoesFonte";
ALTER TABLE "MedicinaNaturalItem" DROP COLUMN IF EXISTS "proveniencia";

ALTER TABLE "MedicinaNaturalItem" ADD COLUMN "fontes" JSONB NOT NULL DEFAULT '[]';
