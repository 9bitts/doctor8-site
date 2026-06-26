-- Organization phase 3 (idempotent)

DO $$ BEGIN CREATE TYPE "TissGuideStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'GLOSA', 'PAID', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TissBatchStatus" AS ENUM ('OPEN', 'SENT', 'PROCESSED', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EmploymentType" AS ENUM ('CLT', 'PJ', 'ASSOCIATE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "OrganizationInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED', 'ERROR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'RECEIVED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PayrollEntryStatus" AS ENUM ('PENDING', 'PAID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "OrganizationHealthPlan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "healthPlanId" TEXT,
    "operatorName" TEXT NOT NULL,
    "ansRegistry" TEXT,
    "contractNumber" TEXT,
    "tissVersion" TEXT NOT NULL DEFAULT '4.01.00',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationHealthPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TissBatch" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TissBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TissGuide" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TissGuide_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrganizationEmployee" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationEmployee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrganizationPayrollEntry" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationPayrollEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrganizationInvoice" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationInvoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrganizationSupplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationSupplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrganizationPurchaseOrder" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationPurchaseOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrganizationSurveyResponse" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "patientName" TEXT,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationSurveyResponse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OrganizationHealthPlan_organizationId_idx" ON "OrganizationHealthPlan"("organizationId");
CREATE INDEX IF NOT EXISTS "TissGuide_organizationId_idx" ON "TissGuide"("organizationId");
CREATE INDEX IF NOT EXISTS "TissGuide_orgHealthPlanId_idx" ON "TissGuide"("orgHealthPlanId");
CREATE INDEX IF NOT EXISTS "TissGuide_batchId_idx" ON "TissGuide"("batchId");
CREATE INDEX IF NOT EXISTS "TissGuide_status_idx" ON "TissGuide"("status");
CREATE INDEX IF NOT EXISTS "TissBatch_organizationId_idx" ON "TissBatch"("organizationId");
CREATE INDEX IF NOT EXISTS "TissBatch_orgHealthPlanId_idx" ON "TissBatch"("orgHealthPlanId");
CREATE INDEX IF NOT EXISTS "OrganizationEmployee_organizationId_idx" ON "OrganizationEmployee"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationPayrollEntry_employeeId_referenceMonth_key" ON "OrganizationPayrollEntry"("employeeId", "referenceMonth");
CREATE INDEX IF NOT EXISTS "OrganizationPayrollEntry_organizationId_idx" ON "OrganizationPayrollEntry"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationInvoice_organizationId_idx" ON "OrganizationInvoice"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationInvoice_organizationId_status_idx" ON "OrganizationInvoice"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "OrganizationSupplier_organizationId_idx" ON "OrganizationSupplier"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationPurchaseOrder_organizationId_idx" ON "OrganizationPurchaseOrder"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationPurchaseOrder_supplierId_idx" ON "OrganizationPurchaseOrder"("supplierId");
CREATE INDEX IF NOT EXISTS "OrganizationSurveyResponse_organizationId_idx" ON "OrganizationSurveyResponse"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationSurveyResponse_organizationId_createdAt_idx" ON "OrganizationSurveyResponse"("organizationId", "createdAt");

DO $$ BEGIN ALTER TABLE "OrganizationHealthPlan" ADD CONSTRAINT "OrganizationHealthPlan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'HealthPlan') THEN
    ALTER TABLE "OrganizationHealthPlan" ADD CONSTRAINT "OrganizationHealthPlan_healthPlanId_fkey" FOREIGN KEY ("healthPlanId") REFERENCES "HealthPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TissGuide" ADD CONSTRAINT "TissGuide_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TissGuide" ADD CONSTRAINT "TissGuide_orgHealthPlanId_fkey" FOREIGN KEY ("orgHealthPlanId") REFERENCES "OrganizationHealthPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TissGuide" ADD CONSTRAINT "TissGuide_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "TissBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TissBatch" ADD CONSTRAINT "TissBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TissBatch" ADD CONSTRAINT "TissBatch_orgHealthPlanId_fkey" FOREIGN KEY ("orgHealthPlanId") REFERENCES "OrganizationHealthPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationEmployee" ADD CONSTRAINT "OrganizationEmployee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationPayrollEntry" ADD CONSTRAINT "OrganizationPayrollEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationPayrollEntry" ADD CONSTRAINT "OrganizationPayrollEntry_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "OrganizationEmployee"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationInvoice" ADD CONSTRAINT "OrganizationInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationSupplier" ADD CONSTRAINT "OrganizationSupplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationPurchaseOrder" ADD CONSTRAINT "OrganizationPurchaseOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationPurchaseOrder" ADD CONSTRAINT "OrganizationPurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "OrganizationSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "OrganizationSurveyResponse" ADD CONSTRAINT "OrganizationSurveyResponse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
