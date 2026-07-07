-- Dentistry portal: odontogram extensions, clinical modules, chair scheduling

DO $$ BEGIN
  CREATE TYPE "DentitionType" AS ENUM ('PERMANENT', 'DECIDUOUS', 'MIXED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DentalAnamnesisStatus" AS ENUM ('PENDING', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DentalTreatmentPlanStatus" AS ENUM ('DRAFT', 'PRESENTED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DentalProstheticStatus" AS ENUM ('ORDERED', 'IN_LAB', 'READY', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrthodonticStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DentalPhotoCategory" AS ENUM ('INTRAORAL', 'EXTRAORAL', 'RADIOGRAPH', 'BEFORE', 'AFTER', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PatientOdontogram" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "teeth" JSONB NOT NULL DEFAULT '{}',
    "generalNotes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PatientOdontogram_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PatientOdontogram" ADD COLUMN IF NOT EXISTS "dentitionType" "DentitionType" NOT NULL DEFAULT 'PERMANENT';
ALTER TABLE "PatientOdontogram" ADD COLUMN IF NOT EXISTS "deciduousTeeth" JSONB NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS "PatientOdontogram_patientRecordId_key" ON "PatientOdontogram"("patientRecordId");
CREATE INDEX IF NOT EXISTS "PatientOdontogram_patientRecordId_idx" ON "PatientOdontogram"("patientRecordId");

DO $$ BEGIN
  ALTER TABLE "PatientOdontogram"
    ADD CONSTRAINT "PatientOdontogram_patientRecordId_fkey"
    FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PatientOdontogram"
    ADD CONSTRAINT "PatientOdontogram_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "ProfessionalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PatientPeriodontogram" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "teeth" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PatientPeriodontogram_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PatientPeriodontogram_patientRecordId_recordedAt_idx" ON "PatientPeriodontogram"("patientRecordId", "recordedAt");
CREATE INDEX IF NOT EXISTS "PatientPeriodontogram_professionalId_idx" ON "PatientPeriodontogram"("professionalId");

DO $$ BEGIN
  ALTER TABLE "PatientPeriodontogram"
    ADD CONSTRAINT "PatientPeriodontogram_patientRecordId_fkey"
    FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "PatientPeriodontogram"
    ADD CONSTRAINT "PatientPeriodontogram_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DentalAnamnesis" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "status" "DentalAnamnesisStatus" NOT NULL DEFAULT 'PENDING',
    "responses" JSONB,
    "tcleSignedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DentalAnamnesis_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DentalAnamnesis_patientRecordId_idx" ON "DentalAnamnesis"("patientRecordId");
CREATE INDEX IF NOT EXISTS "DentalAnamnesis_professionalId_idx" ON "DentalAnamnesis"("professionalId");

DO $$ BEGIN
  ALTER TABLE "DentalAnamnesis"
    ADD CONSTRAINT "DentalAnamnesis_patientRecordId_fkey"
    FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DentalAnamnesis"
    ADD CONSTRAINT "DentalAnamnesis_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DentalTreatmentPlan" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Plano de tratamento',
    "status" "DentalTreatmentPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "totalAmountCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "patientApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DentalTreatmentPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DentalTreatmentPlan_patientRecordId_idx" ON "DentalTreatmentPlan"("patientRecordId");
CREATE INDEX IF NOT EXISTS "DentalTreatmentPlan_professionalId_idx" ON "DentalTreatmentPlan"("professionalId");
CREATE INDEX IF NOT EXISTS "DentalTreatmentPlan_status_idx" ON "DentalTreatmentPlan"("status");

DO $$ BEGIN
  ALTER TABLE "DentalTreatmentPlan"
    ADD CONSTRAINT "DentalTreatmentPlan_patientRecordId_fkey"
    FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DentalTreatmentPlan"
    ADD CONSTRAINT "DentalTreatmentPlan_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DentalTreatmentPlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "procedureCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "toothNumbers" JSONB NOT NULL DEFAULT '[]',
    "surfaces" JSONB,
    "unitPriceCents" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DentalTreatmentPlanItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DentalTreatmentPlanItem_planId_idx" ON "DentalTreatmentPlanItem"("planId");

DO $$ BEGIN
  ALTER TABLE "DentalTreatmentPlanItem"
    ADD CONSTRAINT "DentalTreatmentPlanItem_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "DentalTreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DentalProstheticOrder" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "labName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "toothNumbers" JSONB NOT NULL DEFAULT '[]',
    "status" "DentalProstheticStatus" NOT NULL DEFAULT 'ORDERED',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DentalProstheticOrder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DentalProstheticOrder_patientRecordId_idx" ON "DentalProstheticOrder"("patientRecordId");
CREATE INDEX IF NOT EXISTS "DentalProstheticOrder_professionalId_idx" ON "DentalProstheticOrder"("professionalId");
CREATE INDEX IF NOT EXISTS "DentalProstheticOrder_status_idx" ON "DentalProstheticOrder"("status");

DO $$ BEGIN
  ALTER TABLE "DentalProstheticOrder"
    ADD CONSTRAINT "DentalProstheticOrder_patientRecordId_fkey"
    FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DentalProstheticOrder"
    ADD CONSTRAINT "DentalProstheticOrder_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OrthodonticRecord" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "applianceType" TEXT NOT NULL DEFAULT 'fixed',
    "status" "OrthodonticStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3),
    "estimatedEndDate" TIMESTAMP(3),
    "lastMaintenanceAt" TIMESTAMP(3),
    "nextMaintenanceAt" TIMESTAMP(3),
    "alignerNumber" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrthodonticRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrthodonticRecord_patientRecordId_idx" ON "OrthodonticRecord"("patientRecordId");
CREATE INDEX IF NOT EXISTS "OrthodonticRecord_professionalId_idx" ON "OrthodonticRecord"("professionalId");
CREATE INDEX IF NOT EXISTS "OrthodonticRecord_status_idx" ON "OrthodonticRecord"("status");

DO $$ BEGIN
  ALTER TABLE "OrthodonticRecord"
    ADD CONSTRAINT "OrthodonticRecord_patientRecordId_fkey"
    FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrthodonticRecord"
    ADD CONSTRAINT "OrthodonticRecord_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DentalClinicalPhoto" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "category" "DentalPhotoCategory" NOT NULL DEFAULT 'INTRAORAL',
    "toothNumbers" JSONB,
    "caption" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DentalClinicalPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DentalClinicalPhoto_patientRecordId_takenAt_idx" ON "DentalClinicalPhoto"("patientRecordId", "takenAt");
CREATE INDEX IF NOT EXISTS "DentalClinicalPhoto_professionalId_idx" ON "DentalClinicalPhoto"("professionalId");

DO $$ BEGIN
  ALTER TABLE "DentalClinicalPhoto"
    ADD CONSTRAINT "DentalClinicalPhoto_patientRecordId_fkey"
    FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DentalClinicalPhoto"
    ADD CONSTRAINT "DentalClinicalPhoto_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "DentalChair" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DentalChair_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DentalChair_professionalId_idx" ON "DentalChair"("professionalId");

DO $$ BEGIN
  ALTER TABLE "DentalChair"
    ADD CONSTRAINT "DentalChair_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "dentalChairId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Appointment"
    ADD CONSTRAINT "Appointment_dentalChairId_fkey"
    FOREIGN KEY ("dentalChairId") REFERENCES "DentalChair"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
