-- CreateTable
CREATE TABLE "DrugLeaflet" (
    "id" TEXT NOT NULL,
    "ggremCode" TEXT,
    "activeIngredientKey" TEXT NOT NULL,
    "activeIngredient" TEXT NOT NULL,
    "productName" TEXT,
    "country" TEXT NOT NULL DEFAULT 'BR',
    "anvisaProcessNumber" TEXT,
    "manufacturer" TEXT,
    "pdfUrl" TEXT,
    "externalUrl" TEXT,
    "sections" JSONB NOT NULL,
    "posologyExcerpt" TEXT,
    "source" TEXT NOT NULL DEFAULT 'curated',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrugLeaflet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DrugLeaflet_ggremCode_key" ON "DrugLeaflet"("ggremCode");

-- CreateIndex
CREATE INDEX "DrugLeaflet_activeIngredientKey_idx" ON "DrugLeaflet"("activeIngredientKey");

-- CreateIndex
CREATE INDEX "DrugLeaflet_country_activeIngredientKey_idx" ON "DrugLeaflet"("country", "activeIngredientKey");

-- CreateIndex
CREATE INDEX "DrugLeaflet_active_idx" ON "DrugLeaflet"("active");

-- AddForeignKey
ALTER TABLE "DrugLeaflet" ADD CONSTRAINT "DrugLeaflet_ggremCode_fkey" FOREIGN KEY ("ggremCode") REFERENCES "DrugCatalog"("ggremCode") ON DELETE SET NULL ON UPDATE CASCADE;
