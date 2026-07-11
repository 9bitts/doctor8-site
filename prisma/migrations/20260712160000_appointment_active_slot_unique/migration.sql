-- AGD-06: partial unique indexes prevent double-booking of active appointments per provider slot.
-- Pre-step: cancel duplicate active rows (keep oldest by createdAt) so index creation succeeds in prod.

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "professionalId", "scheduledAt"
           ORDER BY "createdAt" ASC, id ASC
         ) AS rn
  FROM "Appointment"
  WHERE "professionalId" IS NOT NULL
    AND status IN ('CONFIRMED', 'PENDING')
)
UPDATE "Appointment" a
SET status = 'CANCELLED',
    "cancelledAt" = NOW(),
    "cancelReason" = 'migration_dedup_active_slot_20260712160000'
FROM ranked r
WHERE a.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "psychoanalystId", "scheduledAt"
           ORDER BY "createdAt" ASC, id ASC
         ) AS rn
  FROM "Appointment"
  WHERE "psychoanalystId" IS NOT NULL
    AND status IN ('CONFIRMED', 'PENDING')
)
UPDATE "Appointment" a
SET status = 'CANCELLED',
    "cancelledAt" = NOW(),
    "cancelReason" = 'migration_dedup_active_slot_20260712160000'
FROM ranked r
WHERE a.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY "integrativeTherapistId", "scheduledAt"
           ORDER BY "createdAt" ASC, id ASC
         ) AS rn
  FROM "Appointment"
  WHERE "integrativeTherapistId" IS NOT NULL
    AND status IN ('CONFIRMED', 'PENDING')
)
UPDATE "Appointment" a
SET status = 'CANCELLED',
    "cancelledAt" = NOW(),
    "cancelReason" = 'migration_dedup_active_slot_20260712160000'
FROM ranked r
WHERE a.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX "Appointment_professionalId_scheduledAt_active_key"
ON "Appointment" ("professionalId", "scheduledAt")
WHERE "professionalId" IS NOT NULL AND status IN ('CONFIRMED', 'PENDING');

CREATE UNIQUE INDEX "Appointment_psychoanalystId_scheduledAt_active_key"
ON "Appointment" ("psychoanalystId", "scheduledAt")
WHERE "psychoanalystId" IS NOT NULL AND status IN ('CONFIRMED', 'PENDING');

CREATE UNIQUE INDEX "Appointment_integrativeTherapistId_scheduledAt_active_key"
ON "Appointment" ("integrativeTherapistId", "scheduledAt")
WHERE "integrativeTherapistId" IS NOT NULL AND status IN ('CONFIRMED', 'PENDING');
