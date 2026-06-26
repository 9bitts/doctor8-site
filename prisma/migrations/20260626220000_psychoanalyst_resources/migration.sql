-- AlterTable
ALTER TABLE "Resource" ALTER COLUMN "professionalId" DROP NOT NULL;
ALTER TABLE "Resource" ADD COLUMN "psychoanalystId" TEXT;

-- CreateIndex
CREATE INDEX "Resource_psychoanalystId_idx" ON "Resource"("psychoanalystId");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_psychoanalystId_fkey" FOREIGN KEY ("psychoanalystId") REFERENCES "PsychoanalystProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "AnalysandResourceShare" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "analysandRecordId" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysandResourceShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalysandResourceShare_resourceId_analysandRecordId_key" ON "AnalysandResourceShare"("resourceId", "analysandRecordId");

-- AddForeignKey
ALTER TABLE "AnalysandResourceShare" ADD CONSTRAINT "AnalysandResourceShare_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysandResourceShare" ADD CONSTRAINT "AnalysandResourceShare_analysandRecordId_fkey" FOREIGN KEY ("analysandRecordId") REFERENCES "AnalysandRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
