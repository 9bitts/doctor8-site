-- CreateTable
CREATE TABLE "OrganizationLinkedProvider" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerType" "ProviderType" NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "repassePercent" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "status" "OrganizationProfessionalStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationLinkedProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationLinkedProvider_organizationId_providerType_providerProfileId_key" ON "OrganizationLinkedProvider"("organizationId", "providerType", "providerProfileId");

-- CreateIndex
CREATE INDEX "OrganizationLinkedProvider_organizationId_idx" ON "OrganizationLinkedProvider"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationLinkedProvider_providerType_providerProfileId_idx" ON "OrganizationLinkedProvider"("providerType", "providerProfileId");

-- AddForeignKey
ALTER TABLE "OrganizationLinkedProvider" ADD CONSTRAINT "OrganizationLinkedProvider_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
