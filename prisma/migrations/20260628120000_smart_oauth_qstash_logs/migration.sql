-- SMART OAuth + QStash/WhatsApp job logs + reminder epoch dedup

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "remindersEpoch" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "SmartAuthorizationCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "redirectUri" TEXT NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'patient/*.read',
  "codeChallenge" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SmartAuthorizationCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SmartAuthorizationCode_code_key" ON "SmartAuthorizationCode"("code");
CREATE INDEX IF NOT EXISTS "SmartAuthorizationCode_code_idx" ON "SmartAuthorizationCode"("code");
CREATE INDEX IF NOT EXISTS "SmartAuthorizationCode_expiresAt_idx" ON "SmartAuthorizationCode"("expiresAt");

CREATE TABLE IF NOT EXISTS "SmartAccessToken" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SmartAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SmartAccessToken_token_key" ON "SmartAccessToken"("token");
CREATE INDEX IF NOT EXISTS "SmartAccessToken_token_idx" ON "SmartAccessToken"("token");
CREATE INDEX IF NOT EXISTS "SmartAccessToken_expiresAt_idx" ON "SmartAccessToken"("expiresAt");

CREATE TABLE IF NOT EXISTS "QStashJobLog" (
  "id" TEXT NOT NULL,
  "appointmentId" TEXT,
  "jobType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QStashJobLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QStashJobLog_appointmentId_idx" ON "QStashJobLog"("appointmentId");
CREATE INDEX IF NOT EXISTS "QStashJobLog_createdAt_idx" ON "QStashJobLog"("createdAt");

CREATE TABLE IF NOT EXISTS "WhatsAppDeliveryLog" (
  "id" TEXT NOT NULL,
  "messageId" TEXT,
  "phone" TEXT,
  "template" TEXT,
  "status" TEXT NOT NULL,
  "detail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppDeliveryLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WhatsAppDeliveryLog_messageId_idx" ON "WhatsAppDeliveryLog"("messageId");
CREATE INDEX IF NOT EXISTS "WhatsAppDeliveryLog_createdAt_idx" ON "WhatsAppDeliveryLog"("createdAt");
