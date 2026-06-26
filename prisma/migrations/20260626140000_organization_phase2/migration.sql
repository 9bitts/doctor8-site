-- CreateEnum
CREATE TYPE "OrganizationLedgerType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "OrganizationLedgerStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "whatsappRemindersEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "OrganizationLedgerEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "OrganizationLedgerType" NOT NULL,
    "status" "OrganizationLedgerStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT NOT NULL,
    "category" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "professionalId" TEXT,
    "appointmentId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationLedgerEntry_organizationId_idx" ON "OrganizationLedgerEntry"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationLedgerEntry_organizationId_status_idx" ON "OrganizationLedgerEntry"("organizationId", "status");

-- CreateIndex
CREATE INDEX "OrganizationLedgerEntry_organizationId_dueDate_idx" ON "OrganizationLedgerEntry"("organizationId", "dueDate");

-- AddForeignKey
ALTER TABLE "OrganizationLedgerEntry" ADD CONSTRAINT "OrganizationLedgerEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
