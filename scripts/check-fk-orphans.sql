-- Run on production before (re)applying 20260710140000_add_missing_foreign_keys.
-- Each query should return 0 rows. If not, NULL out or fix references before adding FKs.

SELECT 'PaymentRefund.appointmentId' AS check_name, pr.*
FROM "PaymentRefund" pr
WHERE pr."appointmentId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = pr."appointmentId");

SELECT 'PaymentRefund.userId' AS check_name, pr.*
FROM "PaymentRefund" pr
WHERE pr."userId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = pr."userId");

SELECT 'TissGuide.appointmentId' AS check_name, tg.*
FROM "TissGuide" tg
WHERE tg."appointmentId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = tg."appointmentId");

SELECT 'TissGuide.professionalId' AS check_name, tg.*
FROM "TissGuide" tg
WHERE NOT EXISTS (SELECT 1 FROM "ProfessionalProfile" p WHERE p.id = tg."professionalId");

SELECT 'OrganizationLedgerEntry.professionalId' AS check_name, ole.*
FROM "OrganizationLedgerEntry" ole
WHERE ole."professionalId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "ProfessionalProfile" p WHERE p.id = ole."professionalId");

SELECT 'OrganizationLedgerEntry.appointmentId' AS check_name, ole.*
FROM "OrganizationLedgerEntry" ole
WHERE ole."appointmentId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = ole."appointmentId");

SELECT 'OrganizationLedgerEntry.createdById' AS check_name, ole.*
FROM "OrganizationLedgerEntry" ole
WHERE ole."createdById" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = ole."createdById");

SELECT 'OrganizationEmployee.professionalId' AS check_name, oe.*
FROM "OrganizationEmployee" oe
WHERE oe."professionalId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "ProfessionalProfile" p WHERE p.id = oe."professionalId");

SELECT 'OrganizationSurveyResponse.appointmentId' AS check_name, osr.*
FROM "OrganizationSurveyResponse" osr
WHERE osr."appointmentId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Appointment" a WHERE a.id = osr."appointmentId");

SELECT 'PatientRecord.linkedUserId' AS check_name, pr.*
FROM "PatientRecord" pr
WHERE pr."linkedUserId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = pr."linkedUserId");

SELECT 'PatientProfile.adminReviewedById' AS check_name, pp.*
FROM "PatientProfile" pp
WHERE pp."adminReviewedById" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = pp."adminReviewedById");

SELECT 'Prescription.pharmacyDispensedStoreId' AS check_name, rx.*
FROM "Prescription" rx
WHERE rx."pharmacyDispensedStoreId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "PharmacyStore" ps WHERE ps.id = rx."pharmacyDispensedStoreId");
