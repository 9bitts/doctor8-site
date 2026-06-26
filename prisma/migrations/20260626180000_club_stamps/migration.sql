-- CreateEnum
CREATE TYPE "ProfessionalKind" AS ENUM ('MEDICINE', 'PSYCHOLOGY', 'PSYCHOANALYSIS', 'DENTISTRY', 'PHYSIOTHERAPY', 'NUTRITION', 'NURSING', 'INTEGRATIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "ClubStampEventType" AS ENUM ('CONSULTATION', 'SUBSCRIPTION', 'DIVERSITY_BONUS', 'REDEMPTION');

-- CreateTable
CREATE TABLE "ClubStampEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "ClubStampEventType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "appointmentId" TEXT,
    "jitQueueId" TEXT,
    "stripeInvoiceId" TEXT,
    "stripeEventId" TEXT,
    "professionalKind" "ProfessionalKind",
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClubStampEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubDiversityAward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kinds" "ProfessionalKind"[],

    CONSTRAINT "ClubDiversityAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClubStampEntry_appointmentId_key" ON "ClubStampEntry"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubStampEntry_jitQueueId_key" ON "ClubStampEntry"("jitQueueId");

-- CreateIndex
CREATE INDEX "ClubStampEntry_stripeInvoiceId_idx" ON "ClubStampEntry"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ClubStampEntry_stripeEventId_key" ON "ClubStampEntry"("stripeEventId");

-- CreateIndex
CREATE INDEX "ClubStampEntry_userId_createdAt_idx" ON "ClubStampEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ClubStampEntry_userId_eventType_idx" ON "ClubStampEntry"("userId", "eventType");

-- CreateIndex
CREATE INDEX "ClubDiversityAward_userId_awardedAt_idx" ON "ClubDiversityAward"("userId", "awardedAt");

-- AddForeignKey
ALTER TABLE "ClubStampEntry" ADD CONSTRAINT "ClubStampEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubDiversityAward" ADD CONSTRAINT "ClubDiversityAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
