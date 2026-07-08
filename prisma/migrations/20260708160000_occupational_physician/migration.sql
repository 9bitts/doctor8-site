-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'OCCUPATIONAL_PHYSICIAN';

-- CreateEnum
CREATE TYPE "EmployerOccupationalPhysicianStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateTable
CREATE TABLE "EmployerOccupationalPhysician" (
    "id" TEXT NOT NULL,
    "employerCompanyId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "crm" TEXT,
    "status" "EmployerOccupationalPhysicianStatus" NOT NULL DEFAULT 'INVITED',
    "inviteToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),

    CONSTRAINT "EmployerOccupationalPhysician_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployerOccupationalPhysician_inviteToken_key" ON "EmployerOccupationalPhysician"("inviteToken");

-- CreateIndex
CREATE INDEX "EmployerOccupationalPhysician_userId_idx" ON "EmployerOccupationalPhysician"("userId");

-- CreateIndex
CREATE INDEX "EmployerOccupationalPhysician_employerCompanyId_idx" ON "EmployerOccupationalPhysician"("employerCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployerOccupationalPhysician_employerCompanyId_email_key" ON "EmployerOccupationalPhysician"("employerCompanyId", "email");

-- AddForeignKey
ALTER TABLE "EmployerOccupationalPhysician" ADD CONSTRAINT "EmployerOccupationalPhysician_employerCompanyId_fkey" FOREIGN KEY ("employerCompanyId") REFERENCES "EmployerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployerOccupationalPhysician" ADD CONSTRAINT "EmployerOccupationalPhysician_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
