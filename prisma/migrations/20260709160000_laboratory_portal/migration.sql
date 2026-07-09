-- Laboratory B2B portal (blood + imaging exam network)

CREATE TYPE "LaboratoryType" AS ENUM ('BLOOD', 'IMAGING', 'BOTH');
CREATE TYPE "LaboratoryStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'SUSPENDED');
CREATE TYPE "LaboratoryMemberRole" AS ENUM ('OWNER', 'ADMIN', 'STAFF');
CREATE TYPE "LaboratoryMemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');
CREATE TYPE "ExamCategory" AS ENUM ('BLOOD', 'IMAGING');

ALTER TYPE "UserRole" ADD VALUE 'LABORATORY';

CREATE TABLE "Laboratory" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "labType" "LaboratoryType" NOT NULL DEFAULT 'BLOOD',
    "responsibleFirstName" TEXT NOT NULL,
    "responsibleLastName" TEXT NOT NULL,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "addressStreet" TEXT,
    "addressNumber" TEXT,
    "addressComplement" TEXT,
    "addressNeighborhood" TEXT,
    "addressCity" TEXT,
    "addressState" TEXT,
    "addressZip" TEXT,
    "addressCountry" TEXT NOT NULL DEFAULT 'BR',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "LaboratoryStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "platformFeeCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Laboratory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LaboratoryMember" (
    "id" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "LaboratoryMemberRole" NOT NULL,
    "status" "LaboratoryMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaboratoryMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExamCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "ExamCategory" NOT NULL,
    "code" TEXT,
    "searchName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamCatalog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LaboratoryExamItem" (
    "id" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "examCatalogId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "internalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaboratoryExamItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LaboratoryExamImport" (
    "id" TEXT NOT NULL,
    "laboratoryId" TEXT NOT NULL,
    "filename" TEXT,
    "rowsTotal" INTEGER NOT NULL DEFAULT 0,
    "rowsMatched" INTEGER NOT NULL DEFAULT 0,
    "rowsCreated" INTEGER NOT NULL DEFAULT 0,
    "rowsUpdated" INTEGER NOT NULL DEFAULT 0,
    "rowsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errorsJson" JSONB,
    "importedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaboratoryExamImport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Laboratory_cnpj_key" ON "Laboratory"("cnpj");
CREATE UNIQUE INDEX "Laboratory_slug_key" ON "Laboratory"("slug");
CREATE INDEX "Laboratory_status_idx" ON "Laboratory"("status");
CREATE INDEX "Laboratory_labType_idx" ON "Laboratory"("labType");
CREATE INDEX "Laboratory_addressCity_addressState_idx" ON "Laboratory"("addressCity", "addressState");

CREATE UNIQUE INDEX "LaboratoryMember_laboratoryId_userId_key" ON "LaboratoryMember"("laboratoryId", "userId");
CREATE INDEX "LaboratoryMember_userId_idx" ON "LaboratoryMember"("userId");
CREATE INDEX "LaboratoryMember_laboratoryId_idx" ON "LaboratoryMember"("laboratoryId");

CREATE UNIQUE INDEX "ExamCatalog_slug_key" ON "ExamCatalog"("slug");
CREATE INDEX "ExamCatalog_category_idx" ON "ExamCatalog"("category");
CREATE INDEX "ExamCatalog_searchName_idx" ON "ExamCatalog"("searchName");
CREATE INDEX "ExamCatalog_code_idx" ON "ExamCatalog"("code");

CREATE UNIQUE INDEX "LaboratoryExamItem_laboratoryId_examCatalogId_key" ON "LaboratoryExamItem"("laboratoryId", "examCatalogId");
CREATE INDEX "LaboratoryExamItem_laboratoryId_idx" ON "LaboratoryExamItem"("laboratoryId");
CREATE INDEX "LaboratoryExamItem_examCatalogId_idx" ON "LaboratoryExamItem"("examCatalogId");
CREATE INDEX "LaboratoryExamItem_laboratoryId_available_idx" ON "LaboratoryExamItem"("laboratoryId", "available");

CREATE INDEX "LaboratoryExamImport_laboratoryId_idx" ON "LaboratoryExamImport"("laboratoryId");

ALTER TABLE "LaboratoryMember" ADD CONSTRAINT "LaboratoryMember_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LaboratoryMember" ADD CONSTRAINT "LaboratoryMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LaboratoryExamItem" ADD CONSTRAINT "LaboratoryExamItem_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LaboratoryExamItem" ADD CONSTRAINT "LaboratoryExamItem_examCatalogId_fkey" FOREIGN KEY ("examCatalogId") REFERENCES "ExamCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LaboratoryExamImport" ADD CONSTRAINT "LaboratoryExamImport_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "Laboratory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
