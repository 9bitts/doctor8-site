-- Employer phase 3: EAP booking, linked psychologists, onboarding, AEP survey link

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "employerWorkforceMemberId" TEXT;
CREATE INDEX IF NOT EXISTS "Appointment_employerWorkforceMemberId_idx" ON "Appointment"("employerWorkforceMemberId");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_employerWorkforceMemberId_fkey"
  FOREIGN KEY ("employerWorkforceMemberId") REFERENCES "EmployerWorkforceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EmployerCompany" ADD COLUMN IF NOT EXISTS "onboardingJson" JSONB;
ALTER TABLE "EmployerCompany" ADD COLUMN IF NOT EXISTS "planTier" TEXT NOT NULL DEFAULT 'PILOT';

ALTER TABLE "EmployerAepRecord" ADD COLUMN IF NOT EXISTS "surveyCampaignId" TEXT;

CREATE TABLE IF NOT EXISTS "EmployerLinkedPsychologist" (
    "id" TEXT NOT NULL,
    "employerCompanyId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "repassePercent" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployerLinkedPsychologist_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmployerLinkedPsychologist_employerCompanyId_professionalId_key"
  ON "EmployerLinkedPsychologist"("employerCompanyId", "professionalId");
CREATE INDEX IF NOT EXISTS "EmployerLinkedPsychologist_employerCompanyId_idx" ON "EmployerLinkedPsychologist"("employerCompanyId");
CREATE INDEX IF NOT EXISTS "EmployerLinkedPsychologist_professionalId_idx" ON "EmployerLinkedPsychologist"("professionalId");

ALTER TABLE "EmployerLinkedPsychologist" ADD CONSTRAINT "EmployerLinkedPsychologist_employerCompanyId_fkey"
  FOREIGN KEY ("employerCompanyId") REFERENCES "EmployerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmployerLinkedPsychologist" ADD CONSTRAINT "EmployerLinkedPsychologist_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
