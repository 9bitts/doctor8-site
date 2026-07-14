-- PatientProfile.searchText: normalized index for professional platform-wide patient search.
ALTER TABLE "PatientProfile" ADD COLUMN IF NOT EXISTS "searchText" TEXT;

CREATE INDEX IF NOT EXISTS "PatientProfile_searchText_idx" ON "PatientProfile"("searchText");
