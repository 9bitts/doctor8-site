-- CreateEnum
CREATE TYPE "PartnerIntakeStatus" AS ENUM ('NOVA', 'EM_TRIAGEM', 'ORIENTADO_DOCTOR8', 'NA_FILA', 'EM_CONSULTA', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PartnerIntakeEventType" AS ENUM ('FORM_SUBMITTED', 'STATUS_CHANGED', 'CLICKED_DOCTOR8_REGISTER', 'CLICKED_DOCTOR8_LOGIN', 'CLICKED_WHATSAPP_HELP', 'DOCTOR8_EMAIL_VERIFIED', 'VOLUNTEER_ASSIGNED', 'NOTES_UPDATED', 'PATIENT_LINKED');

-- CreateTable
CREATE TABLE "PartnerIntake" (
    "id" TEXT NOT NULL,
    "partner" TEXT NOT NULL DEFAULT 'acura',
    "campaign" TEXT NOT NULL DEFAULT 'sos_venezuela',
    "protocolo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "patientUserId" TEXT,
    "requesterName" TEXT NOT NULL,
    "phoneJson" JSONB NOT NULL,
    "patientNameEnc" TEXT,
    "ageEnc" TEXT,
    "relationship" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "careTypeEnc" TEXT,
    "priorityEnc" TEXT,
    "symptomsEnc" TEXT,
    "notesEnc" TEXT,
    "acuraStatus" "PartnerIntakeStatus" NOT NULL DEFAULT 'NOVA',
    "triageNotes" TEXT,
    "assignedVolunteerLabel" TEXT,
    "referralSource" TEXT,
    "clickedDoctor8RegisterAt" TIMESTAMP(3),
    "clickedDoctor8LoginAt" TIMESTAMP(3),
    "clickedWhatsappHelpAt" TIMESTAMP(3),
    "doctor8RegisteredFlag" BOOLEAN NOT NULL DEFAULT false,
    "doctor8EmailCheckedAt" TIMESTAMP(3),
    "doctor8EmailStatus" TEXT,
    "lgpdPrivacyAccepted" BOOLEAN NOT NULL DEFAULT false,
    "lgpdPrivacyVersion" TEXT,
    "lgpdPrivacyAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerIntake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerIntakeEvent" (
    "id" TEXT NOT NULL,
    "intakeId" TEXT NOT NULL,
    "type" "PartnerIntakeEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB,
    "source" TEXT NOT NULL DEFAULT 'acura',
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerIntakeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerIntake_protocolo_key" ON "PartnerIntake"("protocolo");

-- CreateIndex
CREATE INDEX "PartnerIntake_emailNormalized_idx" ON "PartnerIntake"("emailNormalized");

-- CreateIndex
CREATE INDEX "PartnerIntake_patientUserId_idx" ON "PartnerIntake"("patientUserId");

-- CreateIndex
CREATE INDEX "PartnerIntake_acuraStatus_idx" ON "PartnerIntake"("acuraStatus");

-- CreateIndex
CREATE INDEX "PartnerIntake_submittedAt_idx" ON "PartnerIntake"("submittedAt");

-- CreateIndex
CREATE INDEX "PartnerIntakeEvent_intakeId_occurredAt_idx" ON "PartnerIntakeEvent"("intakeId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerIntakeEvent_intakeId_externalId_key" ON "PartnerIntakeEvent"("intakeId", "externalId");

-- AddForeignKey
ALTER TABLE "PartnerIntake" ADD CONSTRAINT "PartnerIntake_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerIntakeEvent" ADD CONSTRAINT "PartnerIntakeEvent_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "PartnerIntake"("id") ON DELETE CASCADE ON UPDATE CASCADE;
