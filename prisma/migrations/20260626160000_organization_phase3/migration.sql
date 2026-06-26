-- CreateEnum
CREATE TYPE "TissGuideStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'GLOSA', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TissBatchStatus" AS ENUM ('OPEN', 'SENT', 'PROCESSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('CLT', 'PJ', 'ASSOCIATE');

-- CreateEnum
CREATE TYPE "OrganizationInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED', 'ERROR');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollEntryStatus" AS ENUM ('PENDING', 'PAID');

-- CreateTable
CREATE TABLE "OrganizationHealthPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "healthPlanId" TEXT,
    "operatorName" TEXT NOT NULL,
    "ansRegistry" TEXT,
    "contractNumber" TEXT,
    "tissVersion" TEXT NOT NULL DEFAULT '4.01.00',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationHealthPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TissGuide" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orgHealthPlanId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "professionalId" TEXT NOT NULL,
    "guideNumber" TEXT,
    "procedureCode" TEXT NOT NULL DEFAULT '10101012',
    "procedureName" TEXT NOT NULL DEFAULT 'Consulta em consultorio',
    "amountCents" INTEGER NOT NULL,
    "patientName" TEXT NOT NULL,
    "patientCpf" TEXT,
    "cardNumber" TEXT,
    "status" "TissGuideStatus" NOT NULL DEFAULT 'DRAFT',
    "glosaReason" TEXT,
    "glosaAmountCents" INTEGER,
    "batchId" TEXT,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TissGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TissBatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orgHealthPlanId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "TissBatchStatus" NOT NULL DEFAULT 'OPEN',
    "totalGuides" INTEGER NOT NULL DEFAULT 0,
    "totalAmountCents" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TissBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationEmployee" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "professionalId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "cpf" TEXT,
    "employmentType" "EmploymentType" NOT NULL,
    "jobTitle" TEXT,
    "salaryCents" INTEGER,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationPayrollEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "referenceMonth" TEXT NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "deductionsCents" INTEGER NOT NULL DEFAULT 0,
    "netCents" INTEGER NOT NULL,
    "status" "PayrollEntryStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationPayrollEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "number" TEXT,
    "recipientName" TEXT NOT NULL,
    "recipientDoc" TEXT,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "OrganizationInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMP(3),
    "externalProvider" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSupplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationPurchaseOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationPurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSurveyResponse" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "patientName" TEXT,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationSurveyResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationHealthPlan_organizationId_idx" ON "OrganizationHealthPlan"("organizationId");

-- CreateIndex
CREATE INDEX "TissGuide_organizationId_idx" ON "TissGuide"("organizationId");
CREATE INDEX "TissGuide_orgHealthPlanId_idx" ON "TissGuide"("orgHealthPlanId");
CREATE INDEX "TissGuide_batchId_idx" ON "TissGuide"("batchId");
CREATE INDEX "TissGuide_status_idx" ON "TissGuide"("status");

-- CreateIndex
CREATE INDEX "TissBatch_organizationId_idx" ON "TissBatch"("organizationId");
CREATE INDEX "TissBatch_orgHealthPlanId_idx" ON "TissBatch"("orgHealthPlanId");

-- CreateIndex
CREATE INDEX "OrganizationEmployee_organizationId_idx" ON "OrganizationEmployee"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationPayrollEntry_employeeId_referenceMonth_key" ON "OrganizationPayrollEntry"("employeeId", "referenceMonth");
CREATE INDEX "OrganizationPayrollEntry_organizationId_idx" ON "OrganizationPayrollEntry"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationInvoice_organizationId_idx" ON "OrganizationInvoice"("organizationId");
CREATE INDEX "OrganizationInvoice_organizationId_status_idx" ON "OrganizationInvoice"("organizationId", "status");

-- CreateIndex
CREATE INDEX "OrganizationSupplier_organizationId_idx" ON "OrganizationSupplier"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationPurchaseOrder_organizationId_idx" ON "OrganizationPurchaseOrder"("organizationId");
CREATE INDEX "OrganizationPurchaseOrder_supplierId_idx" ON "OrganizationPurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "OrganizationSurveyResponse_organizationId_idx" ON "OrganizationSurveyResponse"("organizationId");
CREATE INDEX "OrganizationSurveyResponse_organizationId_createdAt_idx" ON "OrganizationSurveyResponse"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "OrganizationHealthPlan" ADD CONSTRAINT "OrganizationHealthPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationHealthPlan" ADD CONSTRAINT "OrganizationHealthPlan_healthPlanId_fkey" FOREIGN KEY ("healthPlanId") REFERENCES "HealthPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TissGuide" ADD CONSTRAINT "TissGuide_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TissGuide" ADD CONSTRAINT "TissGuide_orgHealthPlanId_fkey" FOREIGN KEY ("orgHealthPlanId") REFERENCES "OrganizationHealthPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TissGuide" ADD CONSTRAINT "TissGuide_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TissBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TissBatch" ADD CONSTRAINT "TissBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TissBatch" ADD CONSTRAINT "TissBatch_orgHealthPlanId_fkey" FOREIGN KEY ("orgHealthPlanId") REFERENCES "OrganizationHealthPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationEmployee" ADD CONSTRAINT "OrganizationEmployee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationPayrollEntry" ADD CONSTRAINT "OrganizationPayrollEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationPayrollEntry" ADD CONSTRAINT "OrganizationPayrollEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "OrganizationEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationInvoice" ADD CONSTRAINT "OrganizationInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationSupplier" ADD CONSTRAINT "OrganizationSupplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationPurchaseOrder" ADD CONSTRAINT "OrganizationPurchaseOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationPurchaseOrder" ADD CONSTRAINT "OrganizationPurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "OrganizationSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationSurveyResponse" ADD CONSTRAINT "OrganizationSurveyResponse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
