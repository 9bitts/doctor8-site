-- Angel missions (Onda 2): shifts/tasks, signups, hour credits

CREATE TYPE "AngelMissionType" AS ENUM ('TURNO', 'TAREFA');
CREATE TYPE "AngelMissionStatus" AS ENUM ('DRAFT', 'OPEN', 'FULL', 'CLOSED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "AngelSignupStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'ATTENDED', 'NO_SHOW', 'COMPLETED');

CREATE TABLE "AngelMission" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "track" "AngelTrack" NOT NULL,
  "type" "AngelMissionType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "isRemote" BOOLEAN NOT NULL DEFAULT false,
  "location" TEXT,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "capacity" INTEGER NOT NULL DEFAULT 1,
  "requiresVehicle" BOOLEAN NOT NULL DEFAULT false,
  "requiredLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "estimatedMinutes" INTEGER,
  "status" "AngelMissionStatus" NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AngelMission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AngelMission_campaignId_track_status_idx"
  ON "AngelMission"("campaignId", "track", "status");

ALTER TABLE "AngelMission"
  ADD CONSTRAINT "AngelMission_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "HumanitarianCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AngelMissionSignup" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "status" "AngelSignupStatus" NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "minutesCredited" INTEGER,
  "decidedById" TEXT,
  "reminderSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AngelMissionSignup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AngelMissionSignup_missionId_profileId_key"
  ON "AngelMissionSignup"("missionId", "profileId");
CREATE INDEX "AngelMissionSignup_profileId_status_idx"
  ON "AngelMissionSignup"("profileId", "status");

ALTER TABLE "AngelMissionSignup"
  ADD CONSTRAINT "AngelMissionSignup_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "AngelMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AngelMissionSignup"
  ADD CONSTRAINT "AngelMissionSignup_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "AngelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AngelHourLog" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "track" "AngelTrack" NOT NULL,
  "minutes" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "sourceId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AngelHourLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AngelHourLog_profileId_occurredAt_idx"
  ON "AngelHourLog"("profileId", "occurredAt");

ALTER TABLE "AngelHourLog"
  ADD CONSTRAINT "AngelHourLog_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "AngelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
