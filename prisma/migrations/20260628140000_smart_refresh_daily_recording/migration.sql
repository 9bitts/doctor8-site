-- SMART refresh tokens + Daily cloud recording ledger

CREATE TABLE IF NOT EXISTS "SmartRefreshToken" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "accessTokenId" TEXT,
  "clientId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SmartRefreshToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SmartRefreshToken_token_key" ON "SmartRefreshToken"("token");
CREATE INDEX IF NOT EXISTS "SmartRefreshToken_token_idx" ON "SmartRefreshToken"("token");
CREATE INDEX IF NOT EXISTS "SmartRefreshToken_userId_clientId_idx" ON "SmartRefreshToken"("userId", "clientId");
CREATE INDEX IF NOT EXISTS "SmartRefreshToken_expiresAt_idx" ON "SmartRefreshToken"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "SmartRefreshToken" ADD CONSTRAINT "SmartRefreshToken_accessTokenId_fkey"
    FOREIGN KEY ("accessTokenId") REFERENCES "SmartAccessToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "SmartAccessToken_userId_clientId_idx" ON "SmartAccessToken"("userId", "clientId");

CREATE TABLE IF NOT EXISTS "DailyRecordingLog" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT,
  "humanitarianEntryId" TEXT,
  "dailyRoomName" TEXT NOT NULL,
  "cloudRecording" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyRecordingLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DailyRecordingLog_appointmentId_idx" ON "DailyRecordingLog"("appointmentId");
CREATE INDEX IF NOT EXISTS "DailyRecordingLog_humanitarianEntryId_idx" ON "DailyRecordingLog"("humanitarianEntryId");
CREATE INDEX IF NOT EXISTS "DailyRecordingLog_createdAt_idx" ON "DailyRecordingLog"("createdAt");
