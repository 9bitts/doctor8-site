-- Campaign batch send lock (prevents concurrent batch runs)

ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "batchLockAt" TIMESTAMP(3);
