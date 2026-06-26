-- Organization phase 2 (idempotent)

DO $$ BEGIN
  CREATE TYPE "OrganizationLedgerType" AS ENUM ('INCOME', 'EXPENSE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrganizationLedgerStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "whatsappRemindersEnabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "OrganizationLedgerEntry" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrganizationLedgerEntry_organizationId_idx" ON "OrganizationLedgerEntry"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationLedgerEntry_organizationId_status_idx" ON "OrganizationLedgerEntry"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "OrganizationLedgerEntry_organizationId_dueDate_idx" ON "OrganizationLedgerEntry"("organizationId", "dueDate");

DO $$ BEGIN
  ALTER TABLE "OrganizationLedgerEntry"
    ADD CONSTRAINT "OrganizationLedgerEntry_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
