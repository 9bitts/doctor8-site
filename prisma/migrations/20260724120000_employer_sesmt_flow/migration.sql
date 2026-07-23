-- SESMT flow: CNAE, sectors/functions, GHE links, multi-risk PGR fields, referrals, CAT, certificates

ALTER TABLE "EmployerCompany" ADD COLUMN IF NOT EXISTS "cnae" TEXT;

CREATE TABLE IF NOT EXISTS "EmployerSector" (
    "id" TEXT NOT NULL,
    "employerCompanyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployerSector_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmployerSector_employerCompanyId_name_key" ON "EmployerSector"("employerCompanyId", "name");
CREATE INDEX IF NOT EXISTS "EmployerSector_employerCompanyId_idx" ON "EmployerSector"("employerCompanyId");

CREATE TABLE IF NOT EXISTS "EmployerJobFunction" (
    "id" TEXT NOT NULL,
    "employerCompanyId" TEXT NOT NULL,
    "sectorId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weeklyHours" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployerJobFunction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmployerJobFunction_employerCompanyId_name_key" ON "EmployerJobFunction"("employerCompanyId", "name");
CREATE INDEX IF NOT EXISTS "EmployerJobFunction_employerCompanyId_idx" ON "EmployerJobFunction"("employerCompanyId");
CREATE INDEX IF NOT EXISTS "EmployerJobFunction_sectorId_idx" ON "EmployerJobFunction"("sectorId");

DO $$ BEGIN
  CREATE TYPE "EmployerRiskCategory" AS ENUM ('FISICO', 'QUIMICO', 'BIOLOGICO', 'ACIDENTE', 'ERGONOMICO', 'PSICOSSOCIAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "EmployerWorkforceMember" ADD COLUMN IF NOT EXISTS "sectorId" TEXT;
ALTER TABLE "EmployerWorkforceMember" ADD COLUMN IF NOT EXISTS "jobFunctionId" TEXT;
ALTER TABLE "EmployerWorkforceMember" ADD COLUMN IF NOT EXISTS "gheGroupId" TEXT;

CREATE INDEX IF NOT EXISTS "EmployerWorkforceMember_sectorId_idx" ON "EmployerWorkforceMember"("sectorId");
CREATE INDEX IF NOT EXISTS "EmployerWorkforceMember_jobFunctionId_idx" ON "EmployerWorkforceMember"("jobFunctionId");
CREATE INDEX IF NOT EXISTS "EmployerWorkforceMember_gheGroupId_idx" ON "EmployerWorkforceMember"("gheGroupId");

ALTER TABLE "EmployerGheGroup" ADD COLUMN IF NOT EXISTS "sectorId" TEXT;
ALTER TABLE "EmployerGheGroup" ADD COLUMN IF NOT EXISTS "jobFunctionId" TEXT;
CREATE INDEX IF NOT EXISTS "EmployerGheGroup_sectorId_idx" ON "EmployerGheGroup"("sectorId");
CREATE INDEX IF NOT EXISTS "EmployerGheGroup_jobFunctionId_idx" ON "EmployerGheGroup"("jobFunctionId");

ALTER TABLE "EmployerRiskEntry" ADD COLUMN IF NOT EXISTS "gheGroupId" TEXT;
ALTER TABLE "EmployerRiskEntry" ADD COLUMN IF NOT EXISTS "riskCategory" "EmployerRiskCategory" NOT NULL DEFAULT 'PSICOSSOCIAL';
ALTER TABLE "EmployerRiskEntry" ADD COLUMN IF NOT EXISTS "agent" TEXT;
ALTER TABLE "EmployerRiskEntry" ADD COLUMN IF NOT EXISTS "exposureType" TEXT;
ALTER TABLE "EmployerRiskEntry" ADD COLUMN IF NOT EXISTS "exposureLevel" TEXT;
ALTER TABLE "EmployerRiskEntry" ADD COLUMN IF NOT EXISTS "toleranceLimit" TEXT;
CREATE INDEX IF NOT EXISTS "EmployerRiskEntry_gheGroupId_idx" ON "EmployerRiskEntry"("gheGroupId");
CREATE INDEX IF NOT EXISTS "EmployerRiskEntry_riskCategory_idx" ON "EmployerRiskEntry"("riskCategory");

ALTER TABLE "EmployerOccupationalExam" ADD COLUMN IF NOT EXISTS "protocolExamName" TEXT;

DO $$ BEGIN
  CREATE TYPE "EmployerCareReferralSource" AS ENUM ('SCREENING', 'RISK', 'CID_F', 'PAIN_COMPLAINT', 'MANUAL', 'AET_FLAG');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmployerCareReferralTarget" AS ENUM ('EAP', 'AET', 'ERGONOMIST', 'PHYSICIAN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EmployerCareReferralStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "EmployerCareReferral" (
    "id" TEXT NOT NULL,
    "employerCompanyId" TEXT NOT NULL,
    "workforceMemberId" TEXT,
    "source" "EmployerCareReferralSource" NOT NULL,
    "sourceRefId" TEXT,
    "target" "EmployerCareReferralTarget" NOT NULL,
    "status" "EmployerCareReferralStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "EmployerCareReferral_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmployerCareReferral_employerCompanyId_idx" ON "EmployerCareReferral"("employerCompanyId");
CREATE INDEX IF NOT EXISTS "EmployerCareReferral_workforceMemberId_idx" ON "EmployerCareReferral"("workforceMemberId");
CREATE INDEX IF NOT EXISTS "EmployerCareReferral_status_idx" ON "EmployerCareReferral"("status");
CREATE INDEX IF NOT EXISTS "EmployerCareReferral_target_idx" ON "EmployerCareReferral"("target");

CREATE TABLE IF NOT EXISTS "EmployerCatRecord" (
    "id" TEXT NOT NULL,
    "employerCompanyId" TEXT NOT NULL,
    "workforceMemberId" TEXT NOT NULL,
    "occurrenceAt" TIMESTAMP(3) NOT NULL,
    "registrationAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catType" TEXT NOT NULL DEFAULT 'INICIAL',
    "accidentType" TEXT,
    "bodyPart" TEXT,
    "cidCode" TEXT,
    "description" TEXT,
    "leaveDays" INTEGER,
    "esocialQueuedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployerCatRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmployerCatRecord_employerCompanyId_idx" ON "EmployerCatRecord"("employerCompanyId");
CREATE INDEX IF NOT EXISTS "EmployerCatRecord_workforceMemberId_idx" ON "EmployerCatRecord"("workforceMemberId");
CREATE INDEX IF NOT EXISTS "EmployerCatRecord_occurrenceAt_idx" ON "EmployerCatRecord"("occurrenceAt");

CREATE TABLE IF NOT EXISTS "EmployerMedicalCertificate" (
    "id" TEXT NOT NULL,
    "employerCompanyId" TEXT NOT NULL,
    "workforceMemberId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "days" INTEGER,
    "cidCode" TEXT,
    "workRelatedMental" BOOLEAN NOT NULL DEFAULT false,
    "physicianName" TEXT,
    "physicianCrm" TEXT,
    "notes" TEXT,
    "esocialQueuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmployerMedicalCertificate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmployerMedicalCertificate_employerCompanyId_idx" ON "EmployerMedicalCertificate"("employerCompanyId");
CREATE INDEX IF NOT EXISTS "EmployerMedicalCertificate_workforceMemberId_idx" ON "EmployerMedicalCertificate"("workforceMemberId");
CREATE INDEX IF NOT EXISTS "EmployerMedicalCertificate_startDate_idx" ON "EmployerMedicalCertificate"("startDate");
CREATE INDEX IF NOT EXISTS "EmployerMedicalCertificate_cidCode_idx" ON "EmployerMedicalCertificate"("cidCode");

DO $$ BEGIN
  ALTER TABLE "EmployerSector" ADD CONSTRAINT "EmployerSector_employerCompanyId_fkey" FOREIGN KEY ("employerCompanyId") REFERENCES "EmployerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmployerJobFunction" ADD CONSTRAINT "EmployerJobFunction_employerCompanyId_fkey" FOREIGN KEY ("employerCompanyId") REFERENCES "EmployerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmployerJobFunction" ADD CONSTRAINT "EmployerJobFunction_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "EmployerSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmployerWorkforceMember" ADD CONSTRAINT "EmployerWorkforceMember_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "EmployerSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmployerWorkforceMember" ADD CONSTRAINT "EmployerWorkforceMember_jobFunctionId_fkey" FOREIGN KEY ("jobFunctionId") REFERENCES "EmployerJobFunction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmployerWorkforceMember" ADD CONSTRAINT "EmployerWorkforceMember_gheGroupId_fkey" FOREIGN KEY ("gheGroupId") REFERENCES "EmployerGheGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmployerGheGroup" ADD CONSTRAINT "EmployerGheGroup_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "EmployerSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmployerGheGroup" ADD CONSTRAINT "EmployerGheGroup_jobFunctionId_fkey" FOREIGN KEY ("jobFunctionId") REFERENCES "EmployerJobFunction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmployerRiskEntry" ADD CONSTRAINT "EmployerRiskEntry_gheGroupId_fkey" FOREIGN KEY ("gheGroupId") REFERENCES "EmployerGheGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmployerCareReferral" ADD CONSTRAINT "EmployerCareReferral_employerCompanyId_fkey" FOREIGN KEY ("employerCompanyId") REFERENCES "EmployerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmployerCareReferral" ADD CONSTRAINT "EmployerCareReferral_workforceMemberId_fkey" FOREIGN KEY ("workforceMemberId") REFERENCES "EmployerWorkforceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmployerCatRecord" ADD CONSTRAINT "EmployerCatRecord_employerCompanyId_fkey" FOREIGN KEY ("employerCompanyId") REFERENCES "EmployerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmployerCatRecord" ADD CONSTRAINT "EmployerCatRecord_workforceMemberId_fkey" FOREIGN KEY ("workforceMemberId") REFERENCES "EmployerWorkforceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmployerMedicalCertificate" ADD CONSTRAINT "EmployerMedicalCertificate_employerCompanyId_fkey" FOREIGN KEY ("employerCompanyId") REFERENCES "EmployerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmployerMedicalCertificate" ADD CONSTRAINT "EmployerMedicalCertificate_workforceMemberId_fkey" FOREIGN KEY ("workforceMemberId") REFERENCES "EmployerWorkforceMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
