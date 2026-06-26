-- CreateEnum
CREATE TYPE "HumanitarianQueueStatus" AS ENUM ('WAITING', 'CALLED', 'IN_PROGRESS', 'DONE', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "HumanitarianVolunteerStatus" AS ENUM ('ONLINE', 'BUSY', 'OFFLINE');

-- CreateTable
CREATE TABLE "HumanitarianCampaign" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "region" "UserRegion",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "noShowTimeoutSeconds" INTEGER NOT NULL DEFAULT 180,
    "estimatedMinutesPerPatient" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HumanitarianCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanitarianPool" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "labelEs" TEXT NOT NULL,
    "labelPt" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "maxWaiting" INTEGER NOT NULL DEFAULT 500,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HumanitarianPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanitarianVolunteer" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerType" "ProviderType" NOT NULL,
    "professionalId" TEXT,
    "psychoanalystId" TEXT,
    "status" "HumanitarianVolunteerStatus" NOT NULL DEFAULT 'OFFLINE',
    "lastAssignedAt" TIMESTAMP(3),
    "currentEntryId" TEXT,

    CONSTRAINT "HumanitarianVolunteer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HumanitarianQueueEntry" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "status" "HumanitarianQueueStatus" NOT NULL DEFAULT 'WAITING',
    "position" INTEGER NOT NULL,
    "volunteerId" TEXT,
    "chiefComplaint" TEXT,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "meetingUrl" TEXT,
    "meetingRoomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HumanitarianQueueEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HumanitarianCampaign_slug_key" ON "HumanitarianCampaign"("slug");

-- CreateIndex
CREATE INDEX "HumanitarianCampaign_active_idx" ON "HumanitarianCampaign"("active");

-- CreateIndex
CREATE INDEX "HumanitarianCampaign_slug_idx" ON "HumanitarianCampaign"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "HumanitarianPool_campaignId_slug_key" ON "HumanitarianPool"("campaignId", "slug");

-- CreateIndex
CREATE INDEX "HumanitarianPool_campaignId_idx" ON "HumanitarianPool"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "HumanitarianVolunteer_currentEntryId_key" ON "HumanitarianVolunteer"("currentEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "HumanitarianVolunteer_campaignId_userId_poolId_key" ON "HumanitarianVolunteer"("campaignId", "userId", "poolId");

-- CreateIndex
CREATE INDEX "HumanitarianVolunteer_poolId_status_idx" ON "HumanitarianVolunteer"("poolId", "status");

-- CreateIndex
CREATE INDEX "HumanitarianVolunteer_userId_idx" ON "HumanitarianVolunteer"("userId");

-- CreateIndex
CREATE INDEX "HumanitarianQueueEntry_poolId_status_position_idx" ON "HumanitarianQueueEntry"("poolId", "status", "position");

-- CreateIndex
CREATE INDEX "HumanitarianQueueEntry_patientUserId_status_idx" ON "HumanitarianQueueEntry"("patientUserId", "status");

-- CreateIndex
CREATE INDEX "HumanitarianQueueEntry_campaignId_idx" ON "HumanitarianQueueEntry"("campaignId");

-- AddForeignKey
ALTER TABLE "HumanitarianPool" ADD CONSTRAINT "HumanitarianPool_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "HumanitarianCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanitarianVolunteer" ADD CONSTRAINT "HumanitarianVolunteer_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "HumanitarianCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanitarianVolunteer" ADD CONSTRAINT "HumanitarianVolunteer_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "HumanitarianPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanitarianVolunteer" ADD CONSTRAINT "HumanitarianVolunteer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanitarianVolunteer" ADD CONSTRAINT "HumanitarianVolunteer_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanitarianVolunteer" ADD CONSTRAINT "HumanitarianVolunteer_psychoanalystId_fkey" FOREIGN KEY ("psychoanalystId") REFERENCES "PsychoanalystProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanitarianQueueEntry" ADD CONSTRAINT "HumanitarianQueueEntry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "HumanitarianCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanitarianQueueEntry" ADD CONSTRAINT "HumanitarianQueueEntry_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "HumanitarianPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanitarianQueueEntry" ADD CONSTRAINT "HumanitarianQueueEntry_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanitarianQueueEntry" ADD CONSTRAINT "HumanitarianQueueEntry_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "HumanitarianVolunteer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
