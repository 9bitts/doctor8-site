-- Angel multi-track foundation (tracks, enrollments, screening, availability, training requirements)
-- Note: data backfill is implemented as an application script (requires DB access).

CREATE TYPE "AngelTrack" AS ENUM (
  'ESCUTA',
  'CAMPO',
  'ENTREGAS',
  'PROFISSIONAL',
  'INTERPRETE',
  'RETAGUARDA',
  'EDUCADOR',
  'EMBAIXADOR'
);

CREATE TYPE "AngelTrackStatus" AS ENUM ('INTERESTED', 'APPROVED', 'PAUSED', 'REVOKED');
CREATE TYPE "AngelAvailabilityStatus" AS ENUM ('AVAILABLE', 'LIMITED', 'PAUSED');
CREATE TYPE "AngelScreeningStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'IN_REVIEW', 'VERIFIED', 'REJECTED');

ALTER TABLE "AngelProfile" ADD COLUMN IF NOT EXISTS "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AngelProfile" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "AngelProfile" ADD COLUMN IF NOT EXISTS "hasVehicle" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AngelProfile" ADD COLUMN IF NOT EXISTS "availabilityNote" TEXT;
ALTER TABLE "AngelProfile" ADD COLUMN IF NOT EXISTS "availabilityStatus" "AngelAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE';
ALTER TABLE "AngelProfile" ADD COLUMN IF NOT EXISTS "pausedUntil" TIMESTAMP(3);

ALTER TABLE "AngelProfile" ADD COLUMN IF NOT EXISTS "screeningStatus" "AngelScreeningStatus" NOT NULL DEFAULT 'NOT_SUBMITTED';
ALTER TABLE "AngelProfile" ADD COLUMN IF NOT EXISTS "screeningNotes" TEXT;
ALTER TABLE "AngelProfile" ADD COLUMN IF NOT EXISTS "screeningReviewedAt" TIMESTAMP(3);
ALTER TABLE "AngelProfile" ADD COLUMN IF NOT EXISTS "screeningReviewedById" TEXT;

CREATE TABLE "AngelTrackEnrollment" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "track" "AngelTrack" NOT NULL,
  "status" "AngelTrackStatus" NOT NULL DEFAULT 'INTERESTED',
  "approvedAt" TIMESTAMP(3),
  "approvedById" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AngelTrackEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AngelTrackEnrollment_profileId_track_key" ON "AngelTrackEnrollment"("profileId", "track");
CREATE INDEX "AngelTrackEnrollment_track_status_idx" ON "AngelTrackEnrollment"("track", "status");

ALTER TABLE "AngelTrackEnrollment"
  ADD CONSTRAINT "AngelTrackEnrollment_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "AngelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AngelTrackTrainingRequirement" (
  "id" TEXT NOT NULL,
  "track" "AngelTrack" NOT NULL,
  "courseId" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AngelTrackTrainingRequirement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AngelTrackTrainingRequirement_track_courseId_key"
  ON "AngelTrackTrainingRequirement"("track", "courseId");
CREATE INDEX "AngelTrackTrainingRequirement_track_idx"
  ON "AngelTrackTrainingRequirement"("track");

CREATE TABLE "AngelTrackTrainingExemption" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "track" "AngelTrack" NOT NULL,
  "exemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "exemptedById" TEXT,
  "reason" TEXT,
  CONSTRAINT "AngelTrackTrainingExemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AngelTrackTrainingExemption_profileId_track_key"
  ON "AngelTrackTrainingExemption"("profileId", "track");
CREATE INDEX "AngelTrackTrainingExemption_track_idx"
  ON "AngelTrackTrainingExemption"("track");

ALTER TABLE "AngelTrackTrainingExemption"
  ADD CONSTRAINT "AngelTrackTrainingExemption_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "AngelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

