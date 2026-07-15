-- Prescription regulatory form kind, SNCR numbering, and multi-document packages

ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "prescriptionFormKind" TEXT;
ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "prescriptionPackageId" TEXT;
ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "sncrReceiptNumber" TEXT;
ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "sncrReceiptType" TEXT;
ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "sncrIssuedAt" TIMESTAMP(3);
ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "issuedViaTelemedicine" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "PrescriptionPackage" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrescriptionPackage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SncrOAuthCredential" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SncrOAuthCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SncrNumberPool" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "receiptType" TEXT NOT NULL,
    "numbers" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SncrNumberPool_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Prescription_prescriptionPackageId_idx" ON "Prescription"("prescriptionPackageId");
CREATE INDEX IF NOT EXISTS "Prescription_prescriptionFormKind_idx" ON "Prescription"("prescriptionFormKind");
CREATE INDEX IF NOT EXISTS "PrescriptionPackage_professionalId_idx" ON "PrescriptionPackage"("professionalId");
CREATE UNIQUE INDEX IF NOT EXISTS "SncrOAuthCredential_professionalId_key" ON "SncrOAuthCredential"("professionalId");
CREATE UNIQUE INDEX IF NOT EXISTS "SncrNumberPool_professionalId_receiptType_key" ON "SncrNumberPool"("professionalId", "receiptType");
CREATE INDEX IF NOT EXISTS "SncrNumberPool_professionalId_idx" ON "SncrNumberPool"("professionalId");

DO $$ BEGIN
  ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_prescriptionPackageId_fkey"
    FOREIGN KEY ("prescriptionPackageId") REFERENCES "PrescriptionPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "PrescriptionPackage" ADD CONSTRAINT "PrescriptionPackage_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SncrOAuthCredential" ADD CONSTRAINT "SncrOAuthCredential_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SncrNumberPool" ADD CONSTRAINT "SncrNumberPool_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
