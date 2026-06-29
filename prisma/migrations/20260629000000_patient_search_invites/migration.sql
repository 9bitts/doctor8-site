-- PatientRecord search index (plaintext normalized names/email for org search)
ALTER TABLE "PatientRecord" ADD COLUMN IF NOT EXISTS "searchText" TEXT;

CREATE INDEX IF NOT EXISTS "PatientRecord_searchText_idx" ON "PatientRecord"("searchText");

-- Patient chart invite tracking
CREATE TYPE "PatientChartInviteStatus" AS ENUM ('SENT', 'LINKED', 'FAILED');

CREATE TABLE IF NOT EXISTS "PatientChartInvite" (
    "id" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "sentByProfessionalId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "PatientChartInviteStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linkedAt" TIMESTAMP(3),

    CONSTRAINT "PatientChartInvite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PatientChartInvite_patientRecordId_idx" ON "PatientChartInvite"("patientRecordId");
CREATE INDEX IF NOT EXISTS "PatientChartInvite_email_idx" ON "PatientChartInvite"("email");
CREATE INDEX IF NOT EXISTS "PatientChartInvite_sentByProfessionalId_idx" ON "PatientChartInvite"("sentByProfessionalId");

ALTER TABLE "PatientChartInvite" ADD CONSTRAINT "PatientChartInvite_patientRecordId_fkey"
    FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PatientChartInvite" ADD CONSTRAINT "PatientChartInvite_sentByProfessionalId_fkey"
    FOREIGN KEY ("sentByProfessionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
