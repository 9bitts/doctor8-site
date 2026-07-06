-- CreateEnum
CREATE TYPE "NutritionIntakeStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NutritionMealType" AS ENUM ('BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'SUPPER', 'OTHER');

-- CreateTable
CREATE TABLE "NutritionAnthropometryEntry" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "bmi" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "hipCm" DOUBLE PRECISION,
    "armCm" DOUBLE PRECISION,
    "thighCm" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionAnthropometryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionMealPlan" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dailyKcalTarget" DOUBLE PRECISION,
    "meals" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionMealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionIntakeForm" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "status" "NutritionIntakeStatus" NOT NULL DEFAULT 'PENDING',
    "responses" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "NutritionIntakeForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionFoodDiaryEntry" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "mealType" "NutritionMealType" NOT NULL,
    "description" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hydrationMl" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionFoodDiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NutritionAnthropometryEntry_patientRecordId_recordedAt_idx" ON "NutritionAnthropometryEntry"("patientRecordId", "recordedAt");

-- CreateIndex
CREATE INDEX "NutritionAnthropometryEntry_professionalId_idx" ON "NutritionAnthropometryEntry"("professionalId");

-- CreateIndex
CREATE INDEX "NutritionMealPlan_patientRecordId_idx" ON "NutritionMealPlan"("patientRecordId");

-- CreateIndex
CREATE INDEX "NutritionMealPlan_professionalId_idx" ON "NutritionMealPlan"("professionalId");

-- CreateIndex
CREATE INDEX "NutritionIntakeForm_patientRecordId_idx" ON "NutritionIntakeForm"("patientRecordId");

-- CreateIndex
CREATE INDEX "NutritionIntakeForm_professionalId_idx" ON "NutritionIntakeForm"("professionalId");

-- CreateIndex
CREATE INDEX "NutritionIntakeForm_status_idx" ON "NutritionIntakeForm"("status");

-- CreateIndex
CREATE INDEX "NutritionFoodDiaryEntry_patientRecordId_recordedAt_idx" ON "NutritionFoodDiaryEntry"("patientRecordId", "recordedAt");

-- CreateIndex
CREATE INDEX "NutritionFoodDiaryEntry_patientUserId_idx" ON "NutritionFoodDiaryEntry"("patientUserId");

-- AddForeignKey
ALTER TABLE "NutritionAnthropometryEntry" ADD CONSTRAINT "NutritionAnthropometryEntry_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionAnthropometryEntry" ADD CONSTRAINT "NutritionAnthropometryEntry_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionMealPlan" ADD CONSTRAINT "NutritionMealPlan_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionMealPlan" ADD CONSTRAINT "NutritionMealPlan_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionIntakeForm" ADD CONSTRAINT "NutritionIntakeForm_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionIntakeForm" ADD CONSTRAINT "NutritionIntakeForm_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionFoodDiaryEntry" ADD CONSTRAINT "NutritionFoodDiaryEntry_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
