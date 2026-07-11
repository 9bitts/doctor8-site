-- AGD-06: partial unique indexes prevent double-booking of active appointments per provider slot.
-- Run scripts/check-appointment-slot-duplicates.mjs before applying in production.

CREATE UNIQUE INDEX "Appointment_professionalId_scheduledAt_active_key"
ON "Appointment" ("professionalId", "scheduledAt")
WHERE "professionalId" IS NOT NULL AND status IN ('CONFIRMED', 'PENDING');

CREATE UNIQUE INDEX "Appointment_psychoanalystId_scheduledAt_active_key"
ON "Appointment" ("psychoanalystId", "scheduledAt")
WHERE "psychoanalystId" IS NOT NULL AND status IN ('CONFIRMED', 'PENDING');

CREATE UNIQUE INDEX "Appointment_integrativeTherapistId_scheduledAt_active_key"
ON "Appointment" ("integrativeTherapistId", "scheduledAt")
WHERE "integrativeTherapistId" IS NOT NULL AND status IN ('CONFIRMED', 'PENDING');
