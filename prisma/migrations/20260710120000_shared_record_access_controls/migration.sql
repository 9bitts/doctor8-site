-- SharedRecord: public link access controls (view limits, PIN, revocation)

ALTER TABLE "SharedRecord" ADD COLUMN IF NOT EXISTS "isPublicLink" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SharedRecord" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SharedRecord" ADD COLUMN IF NOT EXISTS "maxViews" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "SharedRecord" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);
ALTER TABLE "SharedRecord" ADD COLUMN IF NOT EXISTS "viewPinHash" TEXT;

-- Backfill: existing rows with expiresAt were intentional public links
UPDATE "SharedRecord"
SET "isPublicLink" = true
WHERE "expiresAt" IS NOT NULL AND "isPublicLink" = false;

-- Backfill: legacy public links without expiry get 72h from creation
UPDATE "SharedRecord"
SET
  "expiresAt" = "createdAt" + INTERVAL '72 hours',
  "isPublicLink" = true
WHERE "expiresAt" IS NULL
  AND "sharedWithEmail" IS NOT NULL;

-- Any remaining null expiresAt on old public-style rows (accessToken used externally)
UPDATE "SharedRecord"
SET "expiresAt" = "createdAt" + INTERVAL '72 hours'
WHERE "expiresAt" IS NULL
  AND "isPublicLink" = true;
