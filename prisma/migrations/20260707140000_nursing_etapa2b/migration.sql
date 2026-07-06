-- CreateEnum
CREATE TYPE "NursingSbarStatus" AS ENUM ('DRAFT', 'SENT');

-- CreateEnum
CREATE TYPE "NursingMedCheckSource" AS ENUM ('MEDICAL_PRESCRIPTION', 'NURSING_MEDICATION_PRESCRIPTION');

-- CreateEnum
CREATE TYPE "NursingMedCheckResult" AS ENUM ('APPROVED', 'DIVERGENCE', 'NOT_ADMINISTERED');

-- CreateEnum
CREATE TYPE "NursingMedicationRxStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateTable
CREATE TABLE "NursingSbarReport" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "situation" TEXT NOT NULL,
    "background" TEXT NOT NULL,
    "assessment" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "recipientNote" TEXT,
    "status" "NursingSbarStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NursingSbarReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NursingMedCheck" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "nurseId" TEXT NOT NULL,
    "sourceType" "NursingMedCheckSource" NOT NULL,
    "medicalPrescriptionId" TEXT,
    "nursingMedPrescriptionId" TEXT,
    "medicationName" TEXT NOT NULL,
    "medicationSnapshot" JSONB NOT NULL,
    "sixRights" JSONB NOT NULL,
    "result" "NursingMedCheckResult" NOT NULL,
    "divergenceReason" TEXT,
    "notes" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NursingMedCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NursingMedicationPrescription" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "medications" JSONB NOT NULL,
    "instructions" TEXT,
    "validUntil" TIMESTAMP(3),
    "cofenCategory" TEXT,
    "licenseSnapshot" TEXT,
    "status" "NursingMedicationRxStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NursingMedicationPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NursingSbarReport_patientRecordId_createdAt_idx" ON "NursingSbarReport"("patientRecordId", "createdAt");

-- CreateIndex
CREATE INDEX "NursingSbarReport_professionalId_idx" ON "NursingSbarReport"("professionalId");

-- CreateIndex
CREATE INDEX "NursingMedCheck_patientRecordId_checkedAt_idx" ON "NursingMedCheck"("patientRecordId", "checkedAt");

-- CreateIndex
CREATE INDEX "NursingMedCheck_nurseId_idx" ON "NursingMedCheck"("nurseId");

-- CreateIndex
CREATE INDEX "NursingMedCheck_medicalPrescriptionId_idx" ON "NursingMedCheck"("medicalPrescriptionId");

-- CreateIndex
CREATE INDEX "NursingMedCheck_nursingMedPrescriptionId_idx" ON "NursingMedCheck"("nursingMedPrescriptionId");

-- CreateIndex
CREATE INDEX "NursingMedicationPrescription_patientRecordId_createdAt_idx" ON "NursingMedicationPrescription"("patientRecordId", "createdAt");

-- CreateIndex
CREATE INDEX "NursingMedicationPrescription_professionalId_idx" ON "NursingMedicationPrescription"("professionalId");

-- CreateIndex
CREATE INDEX "NursingMedicationPrescription_status_idx" ON "NursingMedicationPrescription"("status");

-- AddForeignKey
ALTER TABLE "NursingSbarReport" ADD CONSTRAINT "NursingSbarReport_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingSbarReport" ADD CONSTRAINT "NursingSbarReport_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingMedCheck" ADD CONSTRAINT "NursingMedCheck_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingMedCheck" ADD CONSTRAINT "NursingMedCheck_nurseId_fkey" FOREIGN KEY ("nurseId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingMedicationPrescription" ADD CONSTRAINT "NursingMedicationPrescription_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingMedicationPrescription" ADD CONSTRAINT "NursingMedicationPrescription_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
