-- Professional library: collections, categories, view tracking

CREATE TABLE "ResourceCollection" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT,
    "psychoanalystId" TEXT,
    "integrativeTherapistId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceCollection_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Resource" ADD COLUMN "collectionId" TEXT;
ALTER TABLE "Resource" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "Resource" ADD COLUMN "contentType" TEXT NOT NULL DEFAULT 'link';
ALTER TABLE "Resource" ADD COLUMN "sourcePackId" TEXT;

ALTER TABLE "ResourceShare" ADD COLUMN "viewedAt" TIMESTAMP(3);
ALTER TABLE "ResourceShare" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "AnalysandResourceShare" ADD COLUMN "viewedAt" TIMESTAMP(3);
ALTER TABLE "AnalysandResourceShare" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "IntegrativeResourceShare" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "integrativeClientRecordId" TEXT NOT NULL,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "IntegrativeResourceShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrativeResourceShare_resourceId_integrativeClientRecordId_key" ON "IntegrativeResourceShare"("resourceId", "integrativeClientRecordId");

ALTER TABLE "IntegrativeResourceShare" ADD CONSTRAINT "IntegrativeResourceShare_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrativeResourceShare" ADD CONSTRAINT "IntegrativeResourceShare_integrativeClientRecordId_fkey" FOREIGN KEY ("integrativeClientRecordId") REFERENCES "IntegrativeClientRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ResourceCollection_professionalId_idx" ON "ResourceCollection"("professionalId");
CREATE INDEX "ResourceCollection_psychoanalystId_idx" ON "ResourceCollection"("psychoanalystId");
CREATE INDEX "ResourceCollection_integrativeTherapistId_idx" ON "ResourceCollection"("integrativeTherapistId");

CREATE INDEX "Resource_collectionId_idx" ON "Resource"("collectionId");
CREATE INDEX "Resource_category_idx" ON "Resource"("category");

ALTER TABLE "ResourceCollection" ADD CONSTRAINT "ResourceCollection_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceCollection" ADD CONSTRAINT "ResourceCollection_psychoanalystId_fkey" FOREIGN KEY ("psychoanalystId") REFERENCES "PsychoanalystProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceCollection" ADD CONSTRAINT "ResourceCollection_integrativeTherapistId_fkey" FOREIGN KEY ("integrativeTherapistId") REFERENCES "IntegrativeTherapistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Resource" ADD CONSTRAINT "Resource_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ResourceCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
