-- AlterTable
ALTER TABLE "PatientProfile" ADD COLUMN "adminNote" TEXT;
ALTER TABLE "PatientProfile" ADD COLUMN "adminReviewedAt" TIMESTAMP(3);
ALTER TABLE "PatientProfile" ADD COLUMN "adminReviewedById" TEXT;
