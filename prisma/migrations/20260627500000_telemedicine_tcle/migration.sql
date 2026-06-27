-- Telemedicine TCLE (informed consent for remote care)

ALTER TYPE "ConsentType" ADD VALUE IF NOT EXISTS 'TELEMEDICINE_TCLE';

ALTER TABLE "HumanitarianIntake" ADD COLUMN IF NOT EXISTS "telemedicineTcleAt" TIMESTAMP(3);
ALTER TABLE "HumanitarianIntake" ADD COLUMN IF NOT EXISTS "telemedicineTcleVersion" TEXT;
