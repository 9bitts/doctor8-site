-- CreateEnum
CREATE TYPE "PatientAcquisitionChannel" AS ENUM ('ACURA_SOS_FORM', 'DOCTOR8_SOS_LANDING', 'DOCTOR8_HUMANITARIAN', 'REGULAR');

-- AlterTable
ALTER TABLE "PatientProfile" ADD COLUMN "acquisitionChannel" "PatientAcquisitionChannel",
ADD COLUMN "acquisitionCampaign" TEXT,
ADD COLUMN "acquisitionRecordedAt" TIMESTAMP(3),
ADD COLUMN "acquisitionReferrer" TEXT;
