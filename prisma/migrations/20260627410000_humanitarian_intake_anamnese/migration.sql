-- AlterTable
ALTER TABLE "HumanitarianIntake" ADD COLUMN "identificationData" JSONB;
ALTER TABLE "HumanitarianIntake" ADD COLUMN "serviceTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "HumanitarianIntake" ADD COLUMN "specialtyData" JSONB;
ALTER TABLE "HumanitarianIntake" ADD COLUMN "basicNeedsData" JSONB;
ALTER TABLE "HumanitarianIntake" ADD COLUMN "consentAt" TIMESTAMP(3);
ALTER TABLE "HumanitarianIntake" ADD COLUMN "additionalNotes" TEXT;
