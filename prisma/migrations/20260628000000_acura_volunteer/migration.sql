-- AcuraBrasil volunteer opt-in badge for provider profiles
ALTER TABLE "ProfessionalProfile" ADD COLUMN IF NOT EXISTS "acuraVolunteer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PsychoanalystProfile" ADD COLUMN IF NOT EXISTS "acuraVolunteer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "IntegrativeTherapistProfile" ADD COLUMN IF NOT EXISTS "acuraVolunteer" BOOLEAN NOT NULL DEFAULT false;
