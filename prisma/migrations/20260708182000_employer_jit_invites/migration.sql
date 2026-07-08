-- JIT corporativo EAP + convite psicólogo na rede

ALTER TYPE "EmployerLinkedPsychologistStatus" ADD VALUE IF NOT EXISTS 'INVITED' BEFORE 'ACTIVE';

ALTER TABLE "EmployerLinkedPsychologist" ADD COLUMN IF NOT EXISTS "inviteToken" TEXT;
ALTER TABLE "EmployerLinkedPsychologist" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "EmployerLinkedPsychologist" ADD COLUMN IF NOT EXISTS "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "EmployerLinkedPsychologist" ALTER COLUMN "joinedAt" DROP NOT NULL;
ALTER TABLE "EmployerLinkedPsychologist" ALTER COLUMN "joinedAt" DROP DEFAULT;

CREATE UNIQUE INDEX IF NOT EXISTS "EmployerLinkedPsychologist_inviteToken_key"
  ON "EmployerLinkedPsychologist"("inviteToken");

ALTER TABLE "JitQueue" ADD COLUMN IF NOT EXISTS "employerWorkforceMemberId" TEXT;
CREATE INDEX IF NOT EXISTS "JitQueue_employerWorkforceMemberId_idx" ON "JitQueue"("employerWorkforceMemberId");
ALTER TABLE "JitQueue" ADD CONSTRAINT "JitQueue_employerWorkforceMemberId_fkey"
  FOREIGN KEY ("employerWorkforceMemberId") REFERENCES "EmployerWorkforceMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
