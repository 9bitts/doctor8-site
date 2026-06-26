-- Club stamps (idempotent)

DO $$ BEGIN
  CREATE TYPE "ProfessionalKind" AS ENUM ('MEDICINE', 'PSYCHOLOGY', 'PSYCHOANALYSIS', 'DENTISTRY', 'PHYSIOTHERAPY', 'NUTRITION', 'NURSING', 'INTEGRATIVE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ClubStampEventType" AS ENUM ('CONSULTATION', 'SUBSCRIPTION', 'DIVERSITY_BONUS', 'REDEMPTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ClubStampEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "ClubStampEventType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "appointmentId" TEXT,
    "jitQueueId" TEXT,
    "stripeInvoiceId" TEXT,
    "stripeEventId" TEXT,
    "professionalKind" "ProfessionalKind",
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClubStampEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ClubDiversityAward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kinds" "ProfessionalKind"[],
    CONSTRAINT "ClubDiversityAward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClubStampEntry_appointmentId_key" ON "ClubStampEntry"("appointmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "ClubStampEntry_jitQueueId_key" ON "ClubStampEntry"("jitQueueId");
CREATE INDEX IF NOT EXISTS "ClubStampEntry_stripeInvoiceId_idx" ON "ClubStampEntry"("stripeInvoiceId");
CREATE UNIQUE INDEX IF NOT EXISTS "ClubStampEntry_stripeEventId_key" ON "ClubStampEntry"("stripeEventId");
CREATE INDEX IF NOT EXISTS "ClubStampEntry_userId_createdAt_idx" ON "ClubStampEntry"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ClubStampEntry_userId_eventType_idx" ON "ClubStampEntry"("userId", "eventType");
CREATE INDEX IF NOT EXISTS "ClubDiversityAward_userId_awardedAt_idx" ON "ClubDiversityAward"("userId", "awardedAt");

DO $$ BEGIN
  ALTER TABLE "ClubStampEntry"
    ADD CONSTRAINT "ClubStampEntry_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ClubDiversityAward"
    ADD CONSTRAINT "ClubDiversityAward_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
