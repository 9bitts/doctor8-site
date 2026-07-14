-- AlterTable
ALTER TABLE "ProfessionalProfile" ADD COLUMN "practicesIntegrativeMedicine" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ProfessionalProfile" ADD COLUMN "integrativeHubSeenAt" TIMESTAMP(3);
