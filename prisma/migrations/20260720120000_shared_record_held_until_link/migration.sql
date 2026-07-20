-- AlterTable
ALTER TABLE "SharedRecord" ADD COLUMN "heldUntilLinkAccepted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "SharedRecord_sharedWithProfessionalId_heldUntilLinkAccepted_idx" ON "SharedRecord"("sharedWithProfessionalId", "heldUntilLinkAccepted");
