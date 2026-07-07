-- CreateEnum
CREATE TYPE "PharmacyIntakeStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PharmacyPrescriptionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PharmacyDispensingStatus" AS ENUM ('VALIDATED', 'DISPENSED', 'PARTIAL', 'REJECTED');

-- CreateEnum
CREATE TYPE "PharmacyEducationType" AS ENUM ('MEDICATION', 'DISEASE', 'LIFESTYLE', 'ADHERENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "PharmacyInteractionSeverity" AS ENUM ('NONE', 'MINOR', 'MODERATE', 'MAJOR', 'CONTRAINDICATED');

-- CreateTable
CREATE TABLE "PharmacyIntakeForm" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "status" "PharmacyIntakeStatus" NOT NULL DEFAULT 'PENDING',
    "responses" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PharmacyIntakeForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyMedReview" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "medications" JSONB NOT NULL,
    "problems" JSONB NOT NULL,
    "recommendations" TEXT,
    "adherenceNotes" TEXT,
    "followUpAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyMedReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyReconciliation" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "sourceContext" TEXT NOT NULL,
    "medicationsBefore" JSONB NOT NULL,
    "medicationsAfter" JSONB NOT NULL,
    "discrepancies" JSONB NOT NULL,
    "notes" TEXT,
    "reconciledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacyReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyMonitoringEntry" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "medicationName" TEXT,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacyMonitoringEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyPrescription" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "medications" JSONB NOT NULL,
    "instructions" TEXT,
    "validUntil" TIMESTAMP(3),
    "licenseSnapshot" TEXT,
    "status" "PharmacyPrescriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmacyPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyEducationSession" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "educationType" "PharmacyEducationType" NOT NULL DEFAULT 'MEDICATION',
    "content" TEXT NOT NULL,
    "materials" JSONB,
    "patientFeedback" TEXT,
    "durationMin" INTEGER,
    "conductedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacyEducationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyDispensingRecord" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "pharmacistId" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "prescriptionSnapshot" JSONB NOT NULL,
    "medicationsDispensed" JSONB NOT NULL,
    "status" "PharmacyDispensingStatus" NOT NULL,
    "validationNotes" TEXT,
    "rejectionReason" TEXT,
    "dispensedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacyDispensingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacyInteractionCheck" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "medications" JSONB NOT NULL,
    "interactions" JSONB NOT NULL,
    "maxSeverity" "PharmacyInteractionSeverity" NOT NULL DEFAULT 'NONE',
    "recommendations" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacyInteractionCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PharmacyIntakeForm_patientRecordId_idx" ON "PharmacyIntakeForm"("patientRecordId");
CREATE INDEX "PharmacyIntakeForm_professionalId_idx" ON "PharmacyIntakeForm"("professionalId");
CREATE INDEX "PharmacyIntakeForm_status_idx" ON "PharmacyIntakeForm"("status");

CREATE INDEX "PharmacyMedReview_patientRecordId_reviewedAt_idx" ON "PharmacyMedReview"("patientRecordId", "reviewedAt");
CREATE INDEX "PharmacyMedReview_professionalId_idx" ON "PharmacyMedReview"("professionalId");

CREATE INDEX "PharmacyReconciliation_patientRecordId_reconciledAt_idx" ON "PharmacyReconciliation"("patientRecordId", "reconciledAt");
CREATE INDEX "PharmacyReconciliation_professionalId_idx" ON "PharmacyReconciliation"("professionalId");

CREATE INDEX "PharmacyMonitoringEntry_patientRecordId_recordedAt_idx" ON "PharmacyMonitoringEntry"("patientRecordId", "recordedAt");
CREATE INDEX "PharmacyMonitoringEntry_patientUserId_idx" ON "PharmacyMonitoringEntry"("patientUserId");

CREATE INDEX "PharmacyPrescription_patientRecordId_createdAt_idx" ON "PharmacyPrescription"("patientRecordId", "createdAt");
CREATE INDEX "PharmacyPrescription_professionalId_idx" ON "PharmacyPrescription"("professionalId");
CREATE INDEX "PharmacyPrescription_status_idx" ON "PharmacyPrescription"("status");

CREATE INDEX "PharmacyEducationSession_patientRecordId_conductedAt_idx" ON "PharmacyEducationSession"("patientRecordId", "conductedAt");
CREATE INDEX "PharmacyEducationSession_professionalId_idx" ON "PharmacyEducationSession"("professionalId");

CREATE INDEX "PharmacyDispensingRecord_patientRecordId_dispensedAt_idx" ON "PharmacyDispensingRecord"("patientRecordId", "dispensedAt");
CREATE INDEX "PharmacyDispensingRecord_pharmacistId_idx" ON "PharmacyDispensingRecord"("pharmacistId");
CREATE INDEX "PharmacyDispensingRecord_prescriptionId_idx" ON "PharmacyDispensingRecord"("prescriptionId");

CREATE INDEX "PharmacyInteractionCheck_patientRecordId_checkedAt_idx" ON "PharmacyInteractionCheck"("patientRecordId", "checkedAt");
CREATE INDEX "PharmacyInteractionCheck_professionalId_idx" ON "PharmacyInteractionCheck"("professionalId");

-- AddForeignKey
ALTER TABLE "PharmacyIntakeForm" ADD CONSTRAINT "PharmacyIntakeForm_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyIntakeForm" ADD CONSTRAINT "PharmacyIntakeForm_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PharmacyMedReview" ADD CONSTRAINT "PharmacyMedReview_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyMedReview" ADD CONSTRAINT "PharmacyMedReview_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PharmacyReconciliation" ADD CONSTRAINT "PharmacyReconciliation_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyReconciliation" ADD CONSTRAINT "PharmacyReconciliation_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PharmacyMonitoringEntry" ADD CONSTRAINT "PharmacyMonitoringEntry_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PharmacyPrescription" ADD CONSTRAINT "PharmacyPrescription_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyPrescription" ADD CONSTRAINT "PharmacyPrescription_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PharmacyEducationSession" ADD CONSTRAINT "PharmacyEducationSession_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyEducationSession" ADD CONSTRAINT "PharmacyEducationSession_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PharmacyDispensingRecord" ADD CONSTRAINT "PharmacyDispensingRecord_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyDispensingRecord" ADD CONSTRAINT "PharmacyDispensingRecord_pharmacistId_fkey" FOREIGN KEY ("pharmacistId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PharmacyInteractionCheck" ADD CONSTRAINT "PharmacyInteractionCheck_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PharmacyInteractionCheck" ADD CONSTRAINT "PharmacyInteractionCheck_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
