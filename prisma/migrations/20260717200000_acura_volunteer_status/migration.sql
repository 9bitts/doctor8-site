-- AcuraBrasil volunteer status (admin-controlled approval)
CREATE TYPE "AcuraVolunteerStatus" AS ENUM ('NONE', 'PENDING', 'ACTIVE', 'REVOKED');

ALTER TABLE "ProfessionalProfile"
  ADD COLUMN IF NOT EXISTS "acuraVolunteerStatus" "AcuraVolunteerStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "acuraVolunteerApprovedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "acuraVolunteerApprovedBy" TEXT;

ALTER TABLE "PsychoanalystProfile"
  ADD COLUMN IF NOT EXISTS "acuraVolunteerStatus" "AcuraVolunteerStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "acuraVolunteerApprovedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "acuraVolunteerApprovedBy" TEXT;

ALTER TABLE "IntegrativeTherapistProfile"
  ADD COLUMN IF NOT EXISTS "acuraVolunteerStatus" "AcuraVolunteerStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "acuraVolunteerApprovedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "acuraVolunteerApprovedBy" TEXT;

-- Grandfather existing opt-ins as ACTIVE (seal already implied by acuraVolunteer=true)
UPDATE "ProfessionalProfile"
SET
  "acuraVolunteerStatus" = 'ACTIVE',
  "acuraVolunteerApprovedAt" = COALESCE("acuraVolunteerApprovedAt", "updatedAt")
WHERE "acuraVolunteer" = true AND "acuraVolunteerStatus" = 'NONE';

UPDATE "PsychoanalystProfile"
SET
  "acuraVolunteerStatus" = 'ACTIVE',
  "acuraVolunteerApprovedAt" = COALESCE("acuraVolunteerApprovedAt", "updatedAt")
WHERE "acuraVolunteer" = true AND "acuraVolunteerStatus" = 'NONE';

UPDATE "IntegrativeTherapistProfile"
SET
  "acuraVolunteerStatus" = 'ACTIVE',
  "acuraVolunteerApprovedAt" = COALESCE("acuraVolunteerApprovedAt", "updatedAt")
WHERE "acuraVolunteer" = true AND "acuraVolunteerStatus" = 'NONE';
