-- CreateEnum
CREATE TYPE "NursingIntakeStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NursingScaleType" AS ENUM ('BRADEN', 'MORSE', 'PAIN', 'GLASGOW');

-- CreateTable
CREATE TABLE "NursingAssessment" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NursingAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NursingCarePlan" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "diagnoses" JSONB NOT NULL,
    "interventions" JSONB NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NursingCarePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NursingScaleEntry" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "scaleType" "NursingScaleType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "details" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NursingScaleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NursingIntakeForm" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "status" "NursingIntakeStatus" NOT NULL DEFAULT 'PENDING',
    "responses" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "NursingIntakeForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NursingMonitoringEntry" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "severity" INTEGER,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NursingMonitoringEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NursingAssessment_patientRecordId_idx" ON "NursingAssessment"("patientRecordId");
CREATE INDEX "NursingAssessment_professionalId_idx" ON "NursingAssessment"("professionalId");
CREATE INDEX "NursingCarePlan_patientRecordId_idx" ON "NursingCarePlan"("patientRecordId");
CREATE INDEX "NursingCarePlan_professionalId_idx" ON "NursingCarePlan"("professionalId");
CREATE INDEX "NursingScaleEntry_patientRecordId_recordedAt_idx" ON "NursingScaleEntry"("patientRecordId", "recordedAt");
CREATE INDEX "NursingScaleEntry_professionalId_idx" ON "NursingScaleEntry"("professionalId");
CREATE INDEX "NursingIntakeForm_patientRecordId_idx" ON "NursingIntakeForm"("patientRecordId");
CREATE INDEX "NursingIntakeForm_professionalId_idx" ON "NursingIntakeForm"("professionalId");
CREATE INDEX "NursingIntakeForm_status_idx" ON "NursingIntakeForm"("status");
CREATE INDEX "NursingMonitoringEntry_patientRecordId_recordedAt_idx" ON "NursingMonitoringEntry"("patientRecordId", "recordedAt");
CREATE INDEX "NursingMonitoringEntry_patientUserId_idx" ON "NursingMonitoringEntry"("patientUserId");

-- AddForeignKey
ALTER TABLE "NursingAssessment" ADD CONSTRAINT "NursingAssessment_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NursingAssessment" ADD CONSTRAINT "NursingAssessment_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NursingCarePlan" ADD CONSTRAINT "NursingCarePlan_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NursingCarePlan" ADD CONSTRAINT "NursingCarePlan_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NursingScaleEntry" ADD CONSTRAINT "NursingScaleEntry_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NursingScaleEntry" ADD CONSTRAINT "NursingScaleEntry_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NursingIntakeForm" ADD CONSTRAINT "NursingIntakeForm_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NursingIntakeForm" ADD CONSTRAINT "NursingIntakeForm_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NursingMonitoringEntry" ADD CONSTRAINT "NursingMonitoringEntry_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
