-- Integrative Therapist (PICS / MTCI) role and profile

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'INTEGRATIVE_THERAPIST';
ALTER TYPE "ProviderType" ADD VALUE 'INTEGRATIVE_THERAPIST';

-- CreateTable
CREATE TABLE "IntegrativeTherapistProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "phone" TEXT,
    "picsPractices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "trainingInstitution" TEXT NOT NULL,
    "certifications" TEXT,
    "yearsOfPractice" INTEGER NOT NULL DEFAULT 0,
    "bio" TEXT,
    "clinicName" TEXT,
    "clinicAddress" TEXT,
    "clinicCity" TEXT,
    "clinicState" TEXT,
    "clinicCountry" TEXT,
    "clinicZip" TEXT,
    "clinicLatitude" DOUBLE PRECISION,
    "clinicLongitude" DOUBLE PRECISION,
    "acceptsTeleconsult" BOOLEAN NOT NULL DEFAULT true,
    "acceptsInPerson" BOOLEAN NOT NULL DEFAULT false,
    "consultPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "sessionDurationMins" INTEGER NOT NULL DEFAULT 50,
    "availability" JSONB,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrativeTherapistProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrativeTherapistAvailabilitySlot" (
    "id" TEXT NOT NULL,
    "integrativeTherapistId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDurationMins" INTEGER NOT NULL DEFAULT 50,
    "slotGapMins" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "IntegrativeTherapistAvailabilitySlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrativeClientRecord" (
    "id" TEXT NOT NULL,
    "integrativeTherapistId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" TEXT,
    "mainPractice" TEXT,
    "chiefComplaint" TEXT,
    "treatmentGoals" TEXT,
    "notes" TEXT,
    "processStartDate" TIMESTAMP(3),
    "linkedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrativeClientRecord_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "integrativeTherapistId" TEXT;
ALTER TABLE "MedicalDocument" ADD COLUMN "integrativeTherapistId" TEXT;
ALTER TABLE "MedicalDocument" ADD COLUMN "integrativeClientRecordId" TEXT;
ALTER TABLE "HumanitarianVolunteer" ADD COLUMN "integrativeTherapistId" TEXT;
ALTER TABLE "Resource" ADD COLUMN "integrativeTherapistId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "IntegrativeTherapistProfile_userId_key" ON "IntegrativeTherapistProfile"("userId");
CREATE INDEX "IntegrativeTherapistProfile_userId_idx" ON "IntegrativeTherapistProfile"("userId");
CREATE INDEX "IntegrativeTherapistAvailabilitySlot_integrativeTherapistId_idx" ON "IntegrativeTherapistAvailabilitySlot"("integrativeTherapistId");
CREATE INDEX "IntegrativeClientRecord_integrativeTherapistId_idx" ON "IntegrativeClientRecord"("integrativeTherapistId");
CREATE INDEX "IntegrativeClientRecord_email_idx" ON "IntegrativeClientRecord"("email");
CREATE INDEX "IntegrativeClientRecord_linkedUserId_idx" ON "IntegrativeClientRecord"("linkedUserId");
CREATE INDEX "Appointment_integrativeTherapistId_idx" ON "Appointment"("integrativeTherapistId");
CREATE INDEX "MedicalDocument_integrativeClientRecordId_idx" ON "MedicalDocument"("integrativeClientRecordId");
CREATE INDEX "MedicalDocument_integrativeTherapistId_idx" ON "MedicalDocument"("integrativeTherapistId");
CREATE INDEX "Resource_integrativeTherapistId_idx" ON "Resource"("integrativeTherapistId");

-- AddForeignKey
ALTER TABLE "IntegrativeTherapistProfile" ADD CONSTRAINT "IntegrativeTherapistProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrativeTherapistAvailabilitySlot" ADD CONSTRAINT "IntegrativeTherapistAvailabilitySlot_integrativeTherapistId_fkey" FOREIGN KEY ("integrativeTherapistId") REFERENCES "IntegrativeTherapistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrativeClientRecord" ADD CONSTRAINT "IntegrativeClientRecord_integrativeTherapistId_fkey" FOREIGN KEY ("integrativeTherapistId") REFERENCES "IntegrativeTherapistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_integrativeTherapistId_fkey" FOREIGN KEY ("integrativeTherapistId") REFERENCES "IntegrativeTherapistProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicalDocument" ADD CONSTRAINT "MedicalDocument_integrativeTherapistId_fkey" FOREIGN KEY ("integrativeTherapistId") REFERENCES "IntegrativeTherapistProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MedicalDocument" ADD CONSTRAINT "MedicalDocument_integrativeClientRecordId_fkey" FOREIGN KEY ("integrativeClientRecordId") REFERENCES "IntegrativeClientRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HumanitarianVolunteer" ADD CONSTRAINT "HumanitarianVolunteer_integrativeTherapistId_fkey" FOREIGN KEY ("integrativeTherapistId") REFERENCES "IntegrativeTherapistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_integrativeTherapistId_fkey" FOREIGN KEY ("integrativeTherapistId") REFERENCES "IntegrativeTherapistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
