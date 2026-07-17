-- Grant AcuraBrasil ACTIVE + seal to every already-verified clinical provider.
-- Admin listing approval is the source of truth for the seal going forward.

UPDATE "ProfessionalProfile"
SET
  "acuraVolunteer" = true,
  "acuraVolunteerStatus" = 'ACTIVE',
  "acuraVolunteerApprovedAt" = COALESCE("acuraVolunteerApprovedAt", "verifiedAt", NOW()),
  "acuraVolunteerApprovedBy" = COALESCE("acuraVolunteerApprovedBy", "verifiedBy")
WHERE "verified" = true
  AND ("acuraVolunteerStatus" IS DISTINCT FROM 'ACTIVE' OR "acuraVolunteer" = false);

UPDATE "PsychoanalystProfile"
SET
  "acuraVolunteer" = true,
  "acuraVolunteerStatus" = 'ACTIVE',
  "acuraVolunteerApprovedAt" = COALESCE("acuraVolunteerApprovedAt", "verifiedAt", NOW()),
  "acuraVolunteerApprovedBy" = COALESCE("acuraVolunteerApprovedBy", "verifiedBy")
WHERE "verified" = true
  AND ("acuraVolunteerStatus" IS DISTINCT FROM 'ACTIVE' OR "acuraVolunteer" = false);

UPDATE "IntegrativeTherapistProfile"
SET
  "acuraVolunteer" = true,
  "acuraVolunteerStatus" = 'ACTIVE',
  "acuraVolunteerApprovedAt" = COALESCE("acuraVolunteerApprovedAt", "verifiedAt", NOW()),
  "acuraVolunteerApprovedBy" = COALESCE("acuraVolunteerApprovedBy", "verifiedBy")
WHERE "verified" = true
  AND ("acuraVolunteerStatus" IS DISTINCT FROM 'ACTIVE' OR "acuraVolunteer" = false);
