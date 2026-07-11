-- Resend webhook tracking + scheduled batch

ALTER TABLE "EmailCampaign" ADD COLUMN IF NOT EXISTS "scheduledBatchAt" TIMESTAMP(3);
ALTER TABLE "EmailCampaignRecipient" ADD COLUMN IF NOT EXISTS "resendEmailId" TEXT;
CREATE INDEX IF NOT EXISTS "EmailCampaignRecipient_resendEmailId_idx" ON "EmailCampaignRecipient"("resendEmailId");
