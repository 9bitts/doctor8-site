-- US distributor portal (Zephra and import suppliers)

CREATE TYPE "DistributorStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "DistributorMemberRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');
CREATE TYPE "DistributorMemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

ALTER TYPE "UserRole" ADD VALUE 'DISTRIBUTOR';

CREATE TABLE "Distributor" (
    "id" TEXT NOT NULL,
    "ein" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brandAlias" TEXT,
    "responsibleFirstName" TEXT NOT NULL,
    "responsibleLastName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "addressStreet" TEXT,
    "addressNumber" TEXT,
    "addressComplement" TEXT,
    "addressCity" TEXT,
    "addressState" TEXT,
    "addressZip" TEXT,
    "addressCountry" TEXT NOT NULL DEFAULT 'US',
    "status" "DistributorStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "platformFeePercent" INTEGER NOT NULL DEFAULT 15,
    "stripeConnectAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Distributor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DistributorMember" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "DistributorMemberRole" NOT NULL,
    "status" "DistributorMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DistributorMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Distributor_ein_key" ON "Distributor"("ein");
CREATE UNIQUE INDEX "Distributor_slug_key" ON "Distributor"("slug");
CREATE INDEX "Distributor_status_idx" ON "Distributor"("status");
CREATE INDEX "Distributor_tradeName_idx" ON "Distributor"("tradeName");

CREATE UNIQUE INDEX "DistributorMember_distributorId_userId_key" ON "DistributorMember"("distributorId", "userId");
CREATE INDEX "DistributorMember_userId_idx" ON "DistributorMember"("userId");
CREATE INDEX "DistributorMember_distributorId_idx" ON "DistributorMember"("distributorId");

ALTER TABLE "DistributorMember" ADD CONSTRAINT "DistributorMember_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DistributorMember" ADD CONSTRAINT "DistributorMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
