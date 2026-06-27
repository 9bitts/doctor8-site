-- Angel lay volunteers (humanitarian follow-up)

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ANGEL';

CREATE TYPE "AngelApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "AngelFollowUpChannel" AS ENUM ('WHATSAPP', 'PHONE', 'SMS', 'OTHER');
CREATE TYPE "AngelFollowUpOutcome" AS ENUM ('REACHED_OK', 'NEEDS_HELP', 'NO_ANSWER', 'WRONG_NUMBER', 'ESCALATED', 'OTHER');

ALTER TABLE "HumanitarianIntake" ADD COLUMN IF NOT EXISTS "angelContactConsentAt" TIMESTAMP(3);
ALTER TABLE "HumanitarianIntake" ADD COLUMN IF NOT EXISTS "angelContactConsentVersion" TEXT;

CREATE TABLE "AngelProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "motivation" TEXT,
    "preferredCampaignSlug" TEXT,
    "approvalStatus" "AngelApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AngelProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AngelProfile_userId_key" ON "AngelProfile"("userId");
CREATE INDEX "AngelProfile_approvalStatus_idx" ON "AngelProfile"("approvalStatus");

CREATE TABLE "HumanitarianAngel" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HumanitarianAngel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HumanitarianAngel_campaignId_userId_key" ON "HumanitarianAngel"("campaignId", "userId");
CREATE INDEX "HumanitarianAngel_campaignId_active_idx" ON "HumanitarianAngel"("campaignId", "active");
CREATE INDEX "HumanitarianAngel_userId_idx" ON "HumanitarianAngel"("userId");

CREATE TABLE "HumanitarianAngelFollowUp" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "angelUserId" TEXT NOT NULL,
    "queueEntryId" TEXT,
    "channel" "AngelFollowUpChannel" NOT NULL,
    "outcome" "AngelFollowUpOutcome" NOT NULL,
    "notes" TEXT,
    "needsFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "contactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HumanitarianAngelFollowUp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HumanitarianAngelFollowUp_campaignId_patientUserId_idx" ON "HumanitarianAngelFollowUp"("campaignId", "patientUserId");
CREATE INDEX "HumanitarianAngelFollowUp_angelUserId_contactedAt_idx" ON "HumanitarianAngelFollowUp"("angelUserId", "contactedAt");
CREATE INDEX "HumanitarianAngelFollowUp_queueEntryId_idx" ON "HumanitarianAngelFollowUp"("queueEntryId");

ALTER TABLE "AngelProfile" ADD CONSTRAINT "AngelProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HumanitarianAngel" ADD CONSTRAINT "HumanitarianAngel_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "HumanitarianCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HumanitarianAngel" ADD CONSTRAINT "HumanitarianAngel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HumanitarianAngelFollowUp" ADD CONSTRAINT "HumanitarianAngelFollowUp_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "HumanitarianCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HumanitarianAngelFollowUp" ADD CONSTRAINT "HumanitarianAngelFollowUp_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HumanitarianAngelFollowUp" ADD CONSTRAINT "HumanitarianAngelFollowUp_angelUserId_fkey" FOREIGN KEY ("angelUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HumanitarianAngelFollowUp" ADD CONSTRAINT "HumanitarianAngelFollowUp_queueEntryId_fkey" FOREIGN KEY ("queueEntryId") REFERENCES "HumanitarianQueueEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
