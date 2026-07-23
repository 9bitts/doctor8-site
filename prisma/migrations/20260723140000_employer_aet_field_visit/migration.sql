-- Field visit / AET-lite on EmployerAepRecord
ALTER TABLE "EmployerAepRecord" ADD COLUMN IF NOT EXISTS "fieldVisitJson" JSONB;
ALTER TABLE "EmployerAepRecord" ADD COLUMN IF NOT EXISTS "photoKeys" JSONB;
ALTER TABLE "EmployerAepRecord" ADD COLUMN IF NOT EXISTS "evaluatorName" TEXT;
ALTER TABLE "EmployerAepRecord" ADD COLUMN IF NOT EXISTS "evaluatorSignedAt" TIMESTAMP(3);
ALTER TABLE "EmployerAepRecord" ADD COLUMN IF NOT EXISTS "aetStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "EmployerAepRecord" ADD COLUMN IF NOT EXISTS "aetFindings" TEXT;
ALTER TABLE "EmployerAepRecord" ADD COLUMN IF NOT EXISTS "aetRecommendations" TEXT;
ALTER TABLE "EmployerAepRecord" ADD COLUMN IF NOT EXISTS "aetCompletedAt" TIMESTAMP(3);
