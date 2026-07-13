-- Onda 3: milestones, volunteer certificate, weekly capacity

ALTER TABLE "AngelProfile" ADD COLUMN IF NOT EXISTS "weeklyCapacity" INTEGER;

CREATE TABLE "AngelMilestone" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AngelMilestone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AngelMilestone_profileId_key_key" ON "AngelMilestone"("profileId", "key");
CREATE INDEX "AngelMilestone_profileId_idx" ON "AngelMilestone"("profileId");

ALTER TABLE "AngelMilestone"
  ADD CONSTRAINT "AngelMilestone_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "AngelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AngelVolunteerCertificate" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "verifyCode" TEXT NOT NULL,
  "volunteerName" TEXT NOT NULL,
  "campaignName" TEXT NOT NULL,
  "tracks" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "totalMinutes" INTEGER NOT NULL,
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AngelVolunteerCertificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AngelVolunteerCertificate_profileId_key" ON "AngelVolunteerCertificate"("profileId");
CREATE UNIQUE INDEX "AngelVolunteerCertificate_verifyCode_key" ON "AngelVolunteerCertificate"("verifyCode");

ALTER TABLE "AngelVolunteerCertificate"
  ADD CONSTRAINT "AngelVolunteerCertificate_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "AngelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
