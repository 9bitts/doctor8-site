-- Public profile tables (VirtualCard, PracticeLocation, ProviderService) + volunteer presence.
-- Idempotent ? safe if partially applied via db push in dev.

DO $$ BEGIN
  CREATE TYPE "PublicProfileEventType" AS ENUM ('VIEW', 'BOOK_CLICK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "VirtualCard" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT,
    "psychoanalystId" TEXT,
    "integrativeTherapistId" TEXT,
    "slug" TEXT NOT NULL,
    "specialtySlug" TEXT NOT NULL DEFAULT '',
    "citySlug" TEXT NOT NULL DEFAULT '',
    "headline" TEXT,
    "website" TEXT,
    "googleBusinessUrl" TEXT,
    "socialLinks" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VirtualCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VirtualCard_professionalId_key" ON "VirtualCard"("professionalId");
CREATE UNIQUE INDEX IF NOT EXISTS "VirtualCard_psychoanalystId_key" ON "VirtualCard"("psychoanalystId");
CREATE UNIQUE INDEX IF NOT EXISTS "VirtualCard_integrativeTherapistId_key" ON "VirtualCard"("integrativeTherapistId");
CREATE UNIQUE INDEX IF NOT EXISTS "VirtualCard_slug_key" ON "VirtualCard"("slug");
CREATE INDEX IF NOT EXISTS "VirtualCard_specialtySlug_citySlug_idx" ON "VirtualCard"("specialtySlug", "citySlug");

CREATE TABLE IF NOT EXISTS "PublicProfileEvent" (
    "id" TEXT NOT NULL,
    "virtualCardId" TEXT NOT NULL,
    "type" "PublicProfileEventType" NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublicProfileEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PublicProfileEvent_virtualCardId_createdAt_idx" ON "PublicProfileEvent"("virtualCardId", "createdAt");
CREATE INDEX IF NOT EXISTS "PublicProfileEvent_virtualCardId_type_createdAt_idx" ON "PublicProfileEvent"("virtualCardId", "type", "createdAt");

CREATE TABLE IF NOT EXISTS "PracticeLocation" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT,
    "psychoanalystId" TEXT,
    "integrativeTherapistId" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT,
    "zip" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PracticeLocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PracticeLocation_professionalId_idx" ON "PracticeLocation"("professionalId");
CREATE INDEX IF NOT EXISTS "PracticeLocation_psychoanalystId_idx" ON "PracticeLocation"("psychoanalystId");
CREATE INDEX IF NOT EXISTS "PracticeLocation_integrativeTherapistId_idx" ON "PracticeLocation"("integrativeTherapistId");

CREATE TABLE IF NOT EXISTS "ProviderService" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT,
    "psychoanalystId" TEXT,
    "integrativeTherapistId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProviderService_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ProviderService_professionalId_idx" ON "ProviderService"("professionalId");
CREATE INDEX IF NOT EXISTS "ProviderService_psychoanalystId_idx" ON "ProviderService"("psychoanalystId");
CREATE INDEX IF NOT EXISTS "ProviderService_integrativeTherapistId_idx" ON "ProviderService"("integrativeTherapistId");

ALTER TABLE "HumanitarianVolunteer" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "VirtualCard" ADD CONSTRAINT "VirtualCard_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "VirtualCard" ADD CONSTRAINT "VirtualCard_psychoanalystId_fkey"
    FOREIGN KEY ("psychoanalystId") REFERENCES "PsychoanalystProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "VirtualCard" ADD CONSTRAINT "VirtualCard_integrativeTherapistId_fkey"
    FOREIGN KEY ("integrativeTherapistId") REFERENCES "IntegrativeTherapistProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PublicProfileEvent" ADD CONSTRAINT "PublicProfileEvent_virtualCardId_fkey"
    FOREIGN KEY ("virtualCardId") REFERENCES "VirtualCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PracticeLocation" ADD CONSTRAINT "PracticeLocation_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PracticeLocation" ADD CONSTRAINT "PracticeLocation_psychoanalystId_fkey"
    FOREIGN KEY ("psychoanalystId") REFERENCES "PsychoanalystProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PracticeLocation" ADD CONSTRAINT "PracticeLocation_integrativeTherapistId_fkey"
    FOREIGN KEY ("integrativeTherapistId") REFERENCES "IntegrativeTherapistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProviderService" ADD CONSTRAINT "ProviderService_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProviderService" ADD CONSTRAINT "ProviderService_psychoanalystId_fkey"
    FOREIGN KEY ("psychoanalystId") REFERENCES "PsychoanalystProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProviderService" ADD CONSTRAINT "ProviderService_integrativeTherapistId_fkey"
    FOREIGN KEY ("integrativeTherapistId") REFERENCES "IntegrativeTherapistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
