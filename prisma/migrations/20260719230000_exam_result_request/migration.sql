-- CreateEnum
CREATE TYPE "ExamResultRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "ExamResultRequest" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "patientRecordId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "status" "ExamResultRequestStatus" NOT NULL DEFAULT 'PENDING',
    "viewPinHash" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "maxViews" INTEGER NOT NULL DEFAULT 40,
    "uploadCount" INTEGER NOT NULL DEFAULT 0,
    "maxUploads" INTEGER NOT NULL DEFAULT 5,
    "note" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamResultRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExamResultRequest_token_key" ON "ExamResultRequest"("token");

-- CreateIndex
CREATE INDEX "ExamResultRequest_token_idx" ON "ExamResultRequest"("token");

-- CreateIndex
CREATE INDEX "ExamResultRequest_patientRecordId_idx" ON "ExamResultRequest"("patientRecordId");

-- CreateIndex
CREATE INDEX "ExamResultRequest_professionalId_idx" ON "ExamResultRequest"("professionalId");

-- CreateIndex
CREATE INDEX "ExamResultRequest_status_idx" ON "ExamResultRequest"("status");

-- AddForeignKey
ALTER TABLE "ExamResultRequest" ADD CONSTRAINT "ExamResultRequest_patientRecordId_fkey" FOREIGN KEY ("patientRecordId") REFERENCES "PatientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamResultRequest" ADD CONSTRAINT "ExamResultRequest_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
