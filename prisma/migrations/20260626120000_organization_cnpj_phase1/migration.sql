-- Organization phase 1 (idempotent — safe to re-run after a failed deploy)

DO $$ BEGIN
  CREATE TYPE "OrganizationMemberRole" AS ENUM ('OWNER', 'ADMIN', 'RECEPTIONIST', 'FINANCE', 'HR', 'ACCOUNTANT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrganizationMemberStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrganizationProfessionalStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "UserRole" ADD VALUE 'ORGANIZATION';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT NOT NULL,
    "inscricaoMunicipal" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "logoUrl" TEXT,
    "slug" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "responsibleFirstName" TEXT NOT NULL,
    "responsibleLastName" TEXT NOT NULL,
    "addressStreet" TEXT,
    "addressNumber" TEXT,
    "addressComplement" TEXT,
    "addressNeighborhood" TEXT,
    "addressCity" TEXT,
    "addressState" TEXT,
    "addressZip" TEXT,
    "addressCountry" TEXT NOT NULL DEFAULT 'BR',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationMemberRole" NOT NULL,
    "status" "OrganizationMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "invitedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrganizationProfessional" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "repassePercent" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "status" "OrganizationProfessionalStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationProfessional_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrganizationRepasseRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "professionalId" TEXT,
    "percent" DOUBLE PRECISION NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationRepasseRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OrganizationInvite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrganizationMemberRole" NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_cnpj_key" ON "Organization"("cnpj");
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_inviteCode_key" ON "Organization"("inviteCode");
CREATE INDEX IF NOT EXISTS "Organization_slug_idx" ON "Organization"("slug");
CREATE INDEX IF NOT EXISTS "Organization_cnpj_idx" ON "Organization"("cnpj");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE INDEX IF NOT EXISTS "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationProfessional_organizationId_professionalId_key" ON "OrganizationProfessional"("organizationId", "professionalId");
CREATE INDEX IF NOT EXISTS "OrganizationProfessional_professionalId_idx" ON "OrganizationProfessional"("professionalId");
CREATE INDEX IF NOT EXISTS "OrganizationProfessional_organizationId_idx" ON "OrganizationProfessional"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationRepasseRule_organizationId_idx" ON "OrganizationRepasseRule"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationRepasseRule_professionalId_idx" ON "OrganizationRepasseRule"("professionalId");
CREATE UNIQUE INDEX IF NOT EXISTS "OrganizationInvite_token_key" ON "OrganizationInvite"("token");
CREATE INDEX IF NOT EXISTS "OrganizationInvite_organizationId_idx" ON "OrganizationInvite"("organizationId");
CREATE INDEX IF NOT EXISTS "OrganizationInvite_email_idx" ON "OrganizationInvite"("email");

DO $$ BEGIN
  ALTER TABLE "OrganizationMember"
    ADD CONSTRAINT "OrganizationMember_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrganizationMember"
    ADD CONSTRAINT "OrganizationMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrganizationProfessional"
    ADD CONSTRAINT "OrganizationProfessional_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrganizationProfessional"
    ADD CONSTRAINT "OrganizationProfessional_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrganizationRepasseRule"
    ADD CONSTRAINT "OrganizationRepasseRule_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrganizationRepasseRule"
    ADD CONSTRAINT "OrganizationRepasseRule_professionalId_fkey"
    FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrganizationInvite"
    ADD CONSTRAINT "OrganizationInvite_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
