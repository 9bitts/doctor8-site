-- CreateEnum
CREATE TYPE "HumanitarianIntakeStatus" AS ENUM ('TRIAGE_ONLY', 'PARTIAL', 'COMPLETE');

-- CreateTable
CREATE TABLE "HumanitarianIntake" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "triageData" JSONB,
    "triageCompletedAt" TIMESTAMP(3),
    "computedPriority" "HumanitarianPriority",
    "triageFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "forceMedicalPool" BOOLEAN NOT NULL DEFAULT false,
    "status" "HumanitarianIntakeStatus" NOT NULL DEFAULT 'TRIAGE_ONLY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HumanitarianIntake_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "HumanitarianQueueEntry" ADD COLUMN "intakeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "HumanitarianIntake_campaignId_patientUserId_key" ON "HumanitarianIntake"("campaignId", "patientUserId");

-- CreateIndex
CREATE INDEX "HumanitarianIntake_campaignId_status_idx" ON "HumanitarianIntake"("campaignId", "status");

-- CreateIndex
CREATE INDEX "HumanitarianIntake_campaignId_computedPriority_idx" ON "HumanitarianIntake"("campaignId", "computedPriority");

-- CreateIndex
CREATE INDEX "HumanitarianIntake_patientUserId_idx" ON "HumanitarianIntake"("patientUserId");

-- AddForeignKey
ALTER TABLE "HumanitarianIntake" ADD CONSTRAINT "HumanitarianIntake_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "HumanitarianCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanitarianIntake" ADD CONSTRAINT "HumanitarianIntake_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HumanitarianQueueEntry" ADD CONSTRAINT "HumanitarianQueueEntry_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "HumanitarianIntake"("id") ON DELETE SET NULL ON UPDATE CASCADE;
