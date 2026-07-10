-- CreateEnum
CREATE TYPE "ConsultationPayoutStatus" AS ENUM ('PENDING', 'TRANSFERRED', 'CANCELLED', 'FAILED');

-- CreateTable
CREATE TABLE "ConsultationProfessionalPayout" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "professionalProfileId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "applicationFeeCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "connectAccountId" TEXT NOT NULL,
    "transferEligibleAt" TIMESTAMP(3) NOT NULL,
    "status" "ConsultationPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "stripeTransferId" TEXT,
    "transferredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationProfessionalPayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationProfessionalPayout_appointmentId_key" ON "ConsultationProfessionalPayout"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationProfessionalPayout_stripeTransferId_key" ON "ConsultationProfessionalPayout"("stripeTransferId");

-- CreateIndex
CREATE INDEX "ConsultationProfessionalPayout_status_transferEligibleAt_idx" ON "ConsultationProfessionalPayout"("status", "transferEligibleAt");

-- CreateIndex
CREATE INDEX "ConsultationProfessionalPayout_stripePaymentIntentId_idx" ON "ConsultationProfessionalPayout"("stripePaymentIntentId");

-- AddForeignKey
ALTER TABLE "ConsultationProfessionalPayout" ADD CONSTRAINT "ConsultationProfessionalPayout_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationProfessionalPayout" ADD CONSTRAINT "ConsultationProfessionalPayout_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
