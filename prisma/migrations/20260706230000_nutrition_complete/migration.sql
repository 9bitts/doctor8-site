-- AlterTable
ALTER TABLE "NutritionAnthropometryEntry" ADD COLUMN "context" TEXT DEFAULT 'ADULT';

-- AlterTable
ALTER TABLE "NutritionFoodDiaryEntry" ADD COLUMN "photoKey" TEXT;

-- CreateTable
CREATE TABLE "NutritionFoodAnamnesis" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionFoodAnamnesis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NutritionFoodAnamnesis_patientRecordId_idx" ON "NutritionFoodAnamnesis"("patientRecordId");

-- CreateIndex
CREATE INDEX "NutritionFoodAnamnesis_professionalId_idx" ON "NutritionFoodAnamnesis"("professionalId");

-- AddForeignKey
ALTER TABLE "NutritionFoodAnamnesis" ADD CONSTRAINT "NutritionFoodAnamnesis_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionFoodAnamnesis" ADD CONSTRAINT "NutritionFoodAnamnesis_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
