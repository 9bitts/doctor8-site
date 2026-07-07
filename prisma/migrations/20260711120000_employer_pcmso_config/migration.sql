-- Employer PCMSO config (NR-7 integration workflow)

CREATE TABLE "EmployerPcmsoConfig" (
    "id" TEXT NOT NULL,
    "employerCompanyId" TEXT NOT NULL,
    "coordinatorName" TEXT,
    "coordinatorEmail" TEXT,
    "coordinatorCrm" TEXT,
    "lastReviewAt" TIMESTAMP(3),
    "checklistJson" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployerPcmsoConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmployerPcmsoConfig_employerCompanyId_key" ON "EmployerPcmsoConfig"("employerCompanyId");

ALTER TABLE "EmployerPcmsoConfig" ADD CONSTRAINT "EmployerPcmsoConfig_employerCompanyId_fkey" FOREIGN KEY ("employerCompanyId") REFERENCES "EmployerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
