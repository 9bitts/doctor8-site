-- Clear orphaned optional FKs before adding constraints
UPDATE "PaymentRefund" pr
SET "appointmentId" = NULL
WHERE pr."appointmentId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = pr."appointmentId");

UPDATE "PaymentRefund" pr
SET "userId" = NULL
WHERE pr."userId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = pr."userId");

UPDATE "TissGuide" tg
SET "appointmentId" = NULL
WHERE tg."appointmentId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = tg."appointmentId");

UPDATE "OrganizationLedgerEntry" ole
SET "professionalId" = NULL
WHERE ole."professionalId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "ProfessionalProfile" p WHERE p.id = ole."professionalId");

UPDATE "OrganizationLedgerEntry" ole
SET "appointmentId" = NULL
WHERE ole."appointmentId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = ole."appointmentId");

UPDATE "OrganizationLedgerEntry" ole
SET "createdById" = NULL
WHERE ole."createdById" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = ole."createdById");

UPDATE "OrganizationEmployee" oe
SET "professionalId" = NULL
WHERE oe."professionalId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "ProfessionalProfile" p WHERE p.id = oe."professionalId");

UPDATE "OrganizationSurveyResponse" osr
SET "appointmentId" = NULL
WHERE osr."appointmentId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = osr."appointmentId");

UPDATE "PatientRecord" pr
SET "linkedUserId" = NULL
WHERE pr."linkedUserId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = pr."linkedUserId");

UPDATE "PatientProfile" pp
SET "adminReviewedById" = NULL
WHERE pp."adminReviewedById" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = pp."adminReviewedById");

UPDATE "Prescription" rx
SET "pharmacyDispensedStoreId" = NULL
WHERE rx."pharmacyDispensedStoreId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "PharmacyStore" ps WHERE ps.id = rx."pharmacyDispensedStoreId");

-- PaymentRefund
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- TissGuide
ALTER TABLE "TissGuide" ADD CONSTRAINT "TissGuide_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TissGuide" ADD CONSTRAINT "TissGuide_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- OrganizationLedgerEntry
ALTER TABLE "OrganizationLedgerEntry" ADD CONSTRAINT "OrganizationLedgerEntry_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationLedgerEntry" ADD CONSTRAINT "OrganizationLedgerEntry_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationLedgerEntry" ADD CONSTRAINT "OrganizationLedgerEntry_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- OrganizationEmployee
ALTER TABLE "OrganizationEmployee" ADD CONSTRAINT "OrganizationEmployee_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- OrganizationSurveyResponse
ALTER TABLE "OrganizationSurveyResponse" ADD CONSTRAINT "OrganizationSurveyResponse_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PatientRecord
ALTER TABLE "PatientRecord" ADD CONSTRAINT "PatientRecord_linkedUserId_fkey"
  FOREIGN KEY ("linkedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PatientProfile
ALTER TABLE "PatientProfile" ADD CONSTRAINT "PatientProfile_adminReviewedById_fkey"
  FOREIGN KEY ("adminReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prescription
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_pharmacyDispensedStoreId_fkey"
  FOREIGN KEY ("pharmacyDispensedStoreId") REFERENCES "PharmacyStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
