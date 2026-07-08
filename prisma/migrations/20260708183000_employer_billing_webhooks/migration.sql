-- Employer billing, webhooks, EAP annual quota year

ALTER TABLE "EmployerEapBenefit" ADD COLUMN IF NOT EXISTS "quotaYear" INTEGER NOT NULL DEFAULT 2026;

CREATE TABLE IF NOT EXISTS "EmployerBilling" (
    "id" TEXT NOT NULL,
    "employerCompanyId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployerBilling_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmployerBilling_employerCompanyId_key" ON "EmployerBilling"("employerCompanyId");
CREATE UNIQUE INDEX IF NOT EXISTS "EmployerBilling_stripeCustomerId_key" ON "EmployerBilling"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "EmployerBilling_stripeSubscriptionId_key" ON "EmployerBilling"("stripeSubscriptionId");

ALTER TABLE "EmployerBilling" ADD CONSTRAINT "EmployerBilling_employerCompanyId_fkey"
  FOREIGN KEY ("employerCompanyId") REFERENCES "EmployerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "EmployerWebhookEndpoint" (
    "id" TEXT NOT NULL,
    "employerCompanyId" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployerWebhookEndpoint_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmployerWebhookEndpoint_employerCompanyId_idx" ON "EmployerWebhookEndpoint"("employerCompanyId");

ALTER TABLE "EmployerWebhookEndpoint" ADD CONSTRAINT "EmployerWebhookEndpoint_employerCompanyId_fkey"
  FOREIGN KEY ("employerCompanyId") REFERENCES "EmployerCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
