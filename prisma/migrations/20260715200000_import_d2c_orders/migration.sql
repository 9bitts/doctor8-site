-- D2C import orders (Anvisa-gated, Zephra catalog)

CREATE TYPE "ImportOrderStatus" AS ENUM (
  'DRAFT',
  'DOCUMENTS_SUBMITTED',
  'DOCUMENTS_NEEDS_FIX',
  'DOCUMENTS_APPROVED',
  'ANVISA_PENDING',
  'ANVISA_AUTHORIZED',
  'ANVISA_REJECTED',
  'PAYMENT_PENDING',
  'PAID',
  'READY_TO_SHIP',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED'
);

CREATE TYPE "ImportDocumentKind" AS ENUM (
  'ID_DOCUMENT',
  'ADDRESS_PROOF',
  'MEDICAL_REPORT',
  'ANVISA_AUTHORIZATION',
  'OTHER'
);

CREATE TABLE "ImportProduct" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "activeIngredient" TEXT NOT NULL DEFAULT 'tirzepatide',
    "strengthMg" INTEGER NOT NULL,
    "presentationMl" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "priceUsdCents" INTEGER NOT NULL,
    "shippingUsdCents" INTEGER NOT NULL DEFAULT 500,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "daysPerUnit" INTEGER NOT NULL DEFAULT 28,
    "distributorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportOrder" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "prescriptionId" TEXT,
    "productId" TEXT NOT NULL,
    "distributorId" TEXT,
    "status" "ImportOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "treatmentDays" INTEGER NOT NULL DEFAULT 90,
    "productUsdCents" INTEGER NOT NULL,
    "shippingUsdCents" INTEGER NOT NULL DEFAULT 0,
    "feePercent" INTEGER NOT NULL DEFAULT 15,
    "feeBrlCents" INTEGER NOT NULL DEFAULT 0,
    "shipName" TEXT NOT NULL,
    "shipCpf" TEXT,
    "shipPhone" TEXT,
    "shipLine1" TEXT NOT NULL,
    "shipLine2" TEXT,
    "shipCity" TEXT NOT NULL,
    "shipState" TEXT NOT NULL,
    "shipZip" TEXT NOT NULL,
    "shipCountry" TEXT NOT NULL DEFAULT 'BR',
    "anvisaInstrumentType" TEXT,
    "anvisaAuthorizationNumber" TEXT,
    "anvisaAuthorizedAt" TIMESTAMP(3),
    "anvisaExpiresAt" TIMESTAMP(3),
    "anvisaRejectReason" TEXT,
    "patientNotes" TEXT,
    "adminNotes" TEXT,
    "paymentNotes" TEXT,
    "courierName" TEXT,
    "trackingNumber" TEXT,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportOrderDocument" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" "ImportDocumentKind" NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportOrderDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportOrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportOrderEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ImportProduct_slug_key" ON "ImportProduct"("slug");
CREATE INDEX "ImportProduct_active_sortOrder_idx" ON "ImportProduct"("active", "sortOrder");
CREATE INDEX "ImportProduct_distributorId_idx" ON "ImportProduct"("distributorId");

CREATE INDEX "ImportOrder_patientUserId_status_idx" ON "ImportOrder"("patientUserId", "status");
CREATE INDEX "ImportOrder_distributorId_status_idx" ON "ImportOrder"("distributorId", "status");
CREATE INDEX "ImportOrder_status_createdAt_idx" ON "ImportOrder"("status", "createdAt");
CREATE INDEX "ImportOrder_prescriptionId_idx" ON "ImportOrder"("prescriptionId");

CREATE INDEX "ImportOrderDocument_orderId_idx" ON "ImportOrderDocument"("orderId");
CREATE INDEX "ImportOrderEvent_orderId_createdAt_idx" ON "ImportOrderEvent"("orderId", "createdAt");

ALTER TABLE "ImportProduct" ADD CONSTRAINT "ImportProduct_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportOrder" ADD CONSTRAINT "ImportOrder_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportOrder" ADD CONSTRAINT "ImportOrder_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportOrder" ADD CONSTRAINT "ImportOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ImportProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportOrder" ADD CONSTRAINT "ImportOrder_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportOrderDocument" ADD CONSTRAINT "ImportOrderDocument_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ImportOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportOrderEvent" ADD CONSTRAINT "ImportOrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ImportOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Zephra Brazil catalog (Q2 2026 table)
INSERT INTO "ImportProduct" ("id", "slug", "name", "activeIngredient", "strengthMg", "presentationMl", "priceUsdCents", "shippingUsdCents", "active", "sortOrder", "daysPerUnit", "createdAt", "updatedAt")
VALUES
  ('imp_zephra_tz_20', 'zephra-tirzepatide-20mg', 'Zephra Tirzepatide 20 mg', 'tirzepatide', 20, 3, 15500, 500, true, 1, 28, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('imp_zephra_tz_40', 'zephra-tirzepatide-40mg', 'Zephra Tirzepatide 40 mg', 'tirzepatide', 40, 3, 19400, 500, true, 2, 28, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('imp_zephra_tz_60', 'zephra-tirzepatide-60mg', 'Zephra Tirzepatide 60 mg', 'tirzepatide', 60, 3, 27000, 500, true, 3, 28, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
