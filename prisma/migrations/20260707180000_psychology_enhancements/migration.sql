-- Psychology enhancements: digital anamnesis invites

CREATE TYPE "PsychologyAnamnesisStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');

CREATE TABLE "PsychologyAnamnesisInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "status" "PsychologyAnamnesisStatus" NOT NULL DEFAULT 'PENDING',
    "responses" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PsychologyAnamnesisInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PsychologyAnamnesisInvite_token_key" ON "PsychologyAnamnesisInvite"("token");
CREATE INDEX "PsychologyAnamnesisInvite_token_idx" ON "PsychologyAnamnesisInvite"("token");
CREATE INDEX "PsychologyAnamnesisInvite_patientRecordId_idx" ON "PsychologyAnamnesisInvite"("patientRecordId");
CREATE INDEX "PsychologyAnamnesisInvite_professionalId_idx" ON "PsychologyAnamnesisInvite"("professionalId");
CREATE INDEX "PsychologyAnamnesisInvite_status_idx" ON "PsychologyAnamnesisInvite"("status");

ALTER TABLE "PsychologyAnamnesisInvite" ADD CONSTRAINT "PsychologyAnamnesisInvite_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PsychologyAnamnesisInvite" ADD CONSTRAINT "PsychologyAnamnesisInvite_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
