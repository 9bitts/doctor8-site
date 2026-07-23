-- AlterTable EmployerSurveyCampaign
ALTER TABLE "EmployerSurveyCampaign" ADD COLUMN IF NOT EXISTS "analysisJson" JSONB;
ALTER TABLE "EmployerSurveyCampaign" ADD COLUMN IF NOT EXISTS "analyzedAt" TIMESTAMP(3);
ALTER TABLE "EmployerSurveyCampaign" ADD COLUMN IF NOT EXISTS "analyzedByName" TEXT;

-- AlterTable EmployerAepRecord
ALTER TABLE "EmployerAepRecord" ADD COLUMN IF NOT EXISTS "workstationDescription" TEXT;
ALTER TABLE "EmployerAepRecord" ADD COLUMN IF NOT EXISTS "ergonomicScreeningJson" JSONB;
ALTER TABLE "EmployerAepRecord" ADD COLUMN IF NOT EXISTS "recommendAet" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable EmployerPcmsoConfig
ALTER TABLE "EmployerPcmsoConfig" ADD COLUMN IF NOT EXISTS "examMatrixJson" JSONB;

-- AlterTable EmployerOccupationalExam
ALTER TABLE "EmployerOccupationalExam" ADD COLUMN IF NOT EXISTS "screeningJson" JSONB;

-- CreateTable EmployerGheGroup
CREATE TABLE IF NOT EXISTS "EmployerGheGroup" (
    "id" TEXT NOT NULL,
    "employerCompanyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "functions" TEXT,
    "workerCount" INTEGER,
    "hazardCodes" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployerGheGroup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmployerGheGroup_employerCompanyId_idx" ON "EmployerGheGroup"("employerCompanyId");

DO $$ BEGIN
  ALTER TABLE "EmployerGheGroup"
    ADD CONSTRAINT "EmployerGheGroup_employerCompanyId_fkey"
    FOREIGN KEY ("employerCompanyId") REFERENCES "EmployerCompany"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
