-- Allow integrative therapists to issue phytotherapy prescriptions

ALTER TABLE "Prescription" ALTER COLUMN "professionalId" DROP NOT NULL;

ALTER TABLE "Prescription" ADD COLUMN "integrativeTherapistId" TEXT;

ALTER TABLE "Prescription"
  ADD CONSTRAINT "Prescription_integrativeTherapistId_fkey"
  FOREIGN KEY ("integrativeTherapistId") REFERENCES "IntegrativeTherapistProfile"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Prescription_integrativeTherapistId_idx" ON "Prescription"("integrativeTherapistId");

ALTER TABLE "PrescriptionTemplate" ALTER COLUMN "professionalId" DROP NOT NULL;

ALTER TABLE "PrescriptionTemplate" ADD COLUMN "integrativeTherapistId" TEXT;

ALTER TABLE "PrescriptionTemplate"
  ADD CONSTRAINT "PrescriptionTemplate_integrativeTherapistId_fkey"
  FOREIGN KEY ("integrativeTherapistId") REFERENCES "IntegrativeTherapistProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "PrescriptionTemplate_integrativeTherapistId_idx" ON "PrescriptionTemplate"("integrativeTherapistId");
