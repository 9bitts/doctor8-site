-- AlterTable
ALTER TABLE "DocumentTemplate" ADD COLUMN "templateCategory" TEXT;

-- AlterTable
ALTER TABLE "PrescriptionTemplate" ADD COLUMN "templateCategory" TEXT;

-- CreateIndex
CREATE INDEX "DocumentTemplate_professionalId_templateCategory_idx" ON "DocumentTemplate"("professionalId", "templateCategory");

-- CreateIndex
CREATE INDEX "PrescriptionTemplate_professionalId_templateCategory_idx" ON "PrescriptionTemplate"("professionalId", "templateCategory");
