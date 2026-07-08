-- EAP session price for B2B repasse settlement
ALTER TABLE "EmployerEapBenefit" ADD COLUMN IF NOT EXISTS "sessionPriceCents" INTEGER NOT NULL DEFAULT 12000;
