-- CreateTable
CREATE TABLE "ProviderLicenseDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderLicenseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderLicenseDocument_userId_idx" ON "ProviderLicenseDocument"("userId");

-- AddForeignKey
ALTER TABLE "ProviderLicenseDocument" ADD CONSTRAINT "ProviderLicenseDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
