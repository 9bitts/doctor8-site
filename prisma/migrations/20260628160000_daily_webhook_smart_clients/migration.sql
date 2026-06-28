-- Daily recording webhook fields + SMART OAuth client registry
ALTER TABLE "DailyRecordingLog" ADD COLUMN IF NOT EXISTS "recordingId" TEXT;
ALTER TABLE "DailyRecordingLog" ADD COLUMN IF NOT EXISTS "downloadUrl" TEXT;
ALTER TABLE "DailyRecordingLog" ADD COLUMN IF NOT EXISTS "durationSecs" INTEGER;
ALTER TABLE "DailyRecordingLog" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "DailyRecordingLog" ADD COLUMN IF NOT EXISTS "readyAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "DailyRecordingLog_dailyRoomName_idx" ON "DailyRecordingLog"("dailyRoomName");

CREATE TABLE IF NOT EXISTS "SmartOAuthClient" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "redirectUris" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SmartOAuthClient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SmartOAuthClient_clientId_key" ON "SmartOAuthClient"("clientId");
