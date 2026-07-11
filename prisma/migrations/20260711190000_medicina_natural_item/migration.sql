-- CreateEnum
CREATE TYPE "CategoriaPraticaMedicinaNatural" AS ENUM ('FITOTERAPICO', 'FLORAL', 'AROMATERAPIA', 'HOMEOPATIA', 'APITERAPIA');

-- CreateEnum
CREATE TYPE "StatusRegulatorioMedicinaNatural" AS ENUM ('MEDICAMENTO_REGISTRADO', 'PRODUTO_TRADICIONAL_NOTIFICADO', 'USO_TRADICIONAL_SEM_REGISTRO', 'PRATICA_INTEGRATIVA_NAO_REGULADA');

-- CreateTable
CREATE TABLE "MedicinaNaturalItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomesAlternativos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "nomeCientifico" TEXT,
    "categoriaPratica" "CategoriaPraticaMedicinaNatural" NOT NULL,
    "indicacoes" TEXT NOT NULL,
    "contraindicacoes" TEXT NOT NULL,
    "precaucoes" TEXT NOT NULL,
    "interacoesMedicamentosas" TEXT,
    "posologia" TEXT NOT NULL,
    "viaAdministracao" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "statusRegulatorio" "StatusRegulatorioMedicinaNatural" NOT NULL,
    "fontesReferencia" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "edicoesFonte" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "proveniencia" JSONB,
    "alertaGestacaoPediatria" TEXT,
    "renisus" BOOLEAN NOT NULL DEFAULT false,
    "detalhesEspecificos" JSONB NOT NULL DEFAULT '{}',
    "searchText" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicinaNaturalItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MedicinaNaturalItem_slug_key" ON "MedicinaNaturalItem"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MedicinaNaturalItem_nomeCientifico_key" ON "MedicinaNaturalItem"("nomeCientifico");

-- CreateIndex
CREATE INDEX "MedicinaNaturalItem_categoriaPratica_idx" ON "MedicinaNaturalItem"("categoriaPratica");

-- CreateIndex
CREATE INDEX "MedicinaNaturalItem_categoriaPratica_active_idx" ON "MedicinaNaturalItem"("categoriaPratica", "active");

-- CreateIndex
CREATE INDEX "MedicinaNaturalItem_searchText_idx" ON "MedicinaNaturalItem"("searchText");

-- CreateIndex
CREATE INDEX "MedicinaNaturalItem_nomeCientifico_idx" ON "MedicinaNaturalItem"("nomeCientifico");

-- CreateIndex
CREATE INDEX "MedicinaNaturalItem_statusRegulatorio_idx" ON "MedicinaNaturalItem"("statusRegulatorio");
