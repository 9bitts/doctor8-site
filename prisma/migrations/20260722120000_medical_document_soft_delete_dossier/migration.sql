-- Soft delete for clinical documents + dossier bundling (CTO E7/E9)

ALTER TABLE "MedicalDocument" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "MedicalDocument" ADD COLUMN IF NOT EXISTS "dossierId" TEXT;

CREATE TABLE IF NOT EXISTS "DocumentDossier" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "patientRecordId" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentDossier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DocumentDossierItem" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentDossierItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MedicalDocument_deletedAt_idx" ON "MedicalDocument"("deletedAt");
CREATE INDEX IF NOT EXISTS "MedicalDocument_dossierId_idx" ON "MedicalDocument"("dossierId");
CREATE INDEX IF NOT EXISTS "DocumentDossier_professionalId_idx" ON "DocumentDossier"("professionalId");
CREATE INDEX IF NOT EXISTS "DocumentDossier_patientRecordId_idx" ON "DocumentDossier"("patientRecordId");
CREATE INDEX IF NOT EXISTS "DocumentDossierItem_documentId_idx" ON "DocumentDossierItem"("documentId");

CREATE UNIQUE INDEX IF NOT EXISTS "DocumentDossierItem_dossierId_documentId_key" ON "DocumentDossierItem"("dossierId", "documentId");

DO $$ BEGIN
  ALTER TABLE "DocumentDossier" ADD CONSTRAINT "DocumentDossier_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DocumentDossierItem" ADD CONSTRAINT "DocumentDossierItem_dossierId_fkey"
    FOREIGN KEY ("dossierId") REFERENCES "DocumentDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "MedicalDocument" ADD CONSTRAINT "MedicalDocument_dossierId_fkey"
    FOREIGN KEY ("dossierId") REFERENCES "DocumentDossier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
