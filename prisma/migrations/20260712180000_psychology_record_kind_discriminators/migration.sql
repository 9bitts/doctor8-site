-- PSI-14: additive enum values for psychology document discriminators (no drops/renames)

ALTER TYPE "ClinicalRecordKind" ADD VALUE IF NOT EXISTS 'SESSION_NOTE';
ALTER TYPE "ClinicalRecordKind" ADD VALUE IF NOT EXISTS 'SCALE';
