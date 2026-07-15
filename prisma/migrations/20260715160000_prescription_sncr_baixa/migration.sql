-- SNCR baixa tracking on pharmacy dispense
ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "sncrBaixaAt" TIMESTAMP(3);
ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "sncrBaixaStatus" TEXT;
