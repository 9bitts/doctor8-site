-- CreateEnum
CREATE TYPE "EmployerAsoSource" AS ENUM ('PHYSICIAN', 'TRANSCRITO');

-- AlterTable
ALTER TABLE "EmployerOccupationalExam"
ADD COLUMN "asoSource" "EmployerAsoSource",
ADD COLUMN "asoRetifiedAt" TIMESTAMP(3),
ADD COLUMN "esocialS2220QueuedAt" TIMESTAMP(3);

-- Deduplicate existing S-2220 transmissions before unique index
DELETE FROM "EmployerEsocialTransmission" a
USING "EmployerEsocialTransmission" b
WHERE a.id > b.id
  AND a."employerCompanyId" = b."employerCompanyId"
  AND a."eventType" = b."eventType"
  AND a."eventRefId" IS NOT NULL
  AND a."eventRefId" = b."eventRefId";

-- CreateIndex (idempotent S-2220 per exam)
CREATE UNIQUE INDEX "EmployerEsocialTransmission_employerCompanyId_eventType_eventRefId_key"
ON "EmployerEsocialTransmission"("employerCompanyId", "eventType", "eventRefId");
