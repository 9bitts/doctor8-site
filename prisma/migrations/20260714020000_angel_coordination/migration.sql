-- Onda 4: announcements, wellbeing check-ins, supervision notes

CREATE TABLE "AngelAnnouncement" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT,
  "track" "AngelTrack",
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AngelAnnouncement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AngelAnnouncement_campaignId_track_idx" ON "AngelAnnouncement"("campaignId", "track");

ALTER TABLE "AngelAnnouncement"
  ADD CONSTRAINT "AngelAnnouncement_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "HumanitarianCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AngelWellbeingCheckin" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AngelWellbeingCheckin_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AngelWellbeingCheckin_profileId_createdAt_idx"
  ON "AngelWellbeingCheckin"("profileId", "createdAt");

ALTER TABLE "AngelWellbeingCheckin"
  ADD CONSTRAINT "AngelWellbeingCheckin_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "AngelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AngelSupervisionNote" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AngelSupervisionNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AngelSupervisionNote_profileId_createdAt_idx"
  ON "AngelSupervisionNote"("profileId", "createdAt");

ALTER TABLE "AngelSupervisionNote"
  ADD CONSTRAINT "AngelSupervisionNote_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "AngelProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
