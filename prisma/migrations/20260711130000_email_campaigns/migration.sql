-- Email campaigns for admin bulk outreach

CREATE TABLE IF NOT EXISTS "EmailCampaign" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyHtml" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "batchSize" INTEGER NOT NULL DEFAULT 300,
  "lastError" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailCampaignRecipient" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "token" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "batchNumber" INTEGER,
  "sentAt" TIMESTAMP(3),
  "registeredAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "userId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailCampaignRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailCampaignRecipient_token_key" ON "EmailCampaignRecipient"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "EmailCampaignRecipient_campaignId_email_key" ON "EmailCampaignRecipient"("campaignId", "email");
CREATE INDEX IF NOT EXISTS "EmailCampaignRecipient_campaignId_status_idx" ON "EmailCampaignRecipient"("campaignId", "status");

DO $$ BEGIN
  ALTER TABLE "EmailCampaignRecipient" ADD CONSTRAINT "EmailCampaignRecipient_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
