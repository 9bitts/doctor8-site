-- AlterTable
ALTER TABLE "SlotAvailabilityAlert" ADD COLUMN "integrativeTherapistId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SlotAvailabilityAlert_email_integrativeTherapistId_key" ON "SlotAvailabilityAlert"("email", "integrativeTherapistId");

-- AddForeignKey
ALTER TABLE "SlotAvailabilityAlert" ADD CONSTRAINT "SlotAvailabilityAlert_integrativeTherapistId_fkey" FOREIGN KEY ("integrativeTherapistId") REFERENCES "IntegrativeTherapistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "IntegrativeTherapistReview" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "integrativeTherapistId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrativeTherapistReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrativeTherapistReview_integrativeTherapistId_idx" ON "IntegrativeTherapistReview"("integrativeTherapistId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrativeTherapistReview_patientUserId_integrativeTherapistId_key" ON "IntegrativeTherapistReview"("patientUserId", "integrativeTherapistId");

-- AddForeignKey
ALTER TABLE "IntegrativeTherapistReview" ADD CONSTRAINT "IntegrativeTherapistReview_integrativeTherapistId_fkey" FOREIGN KEY ("integrativeTherapistId") REFERENCES "IntegrativeTherapistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
