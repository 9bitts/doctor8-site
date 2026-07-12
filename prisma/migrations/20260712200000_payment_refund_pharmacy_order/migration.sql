-- AlterTable
ALTER TABLE "PaymentRefund" ADD COLUMN "pharmacyOrderId" TEXT;

-- CreateIndex
CREATE INDEX "PaymentRefund_pharmacyOrderId_idx" ON "PaymentRefund"("pharmacyOrderId");

-- AddForeignKey
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_pharmacyOrderId_fkey" FOREIGN KEY ("pharmacyOrderId") REFERENCES "PharmacyOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
