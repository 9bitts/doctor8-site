-- AGD-35: patient opt-in to be notified when humanitarian volunteers go online.

CREATE TABLE "HumanitarianVolunteerOnlineAlert" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HumanitarianVolunteerOnlineAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HumanitarianVolunteerOnlineAlert_campaignId_userId_key" ON "HumanitarianVolunteerOnlineAlert"("campaignId", "userId");
CREATE INDEX "HumanitarianVolunteerOnlineAlert_campaignId_active_idx" ON "HumanitarianVolunteerOnlineAlert"("campaignId", "active");

ALTER TABLE "HumanitarianVolunteerOnlineAlert" ADD CONSTRAINT "HumanitarianVolunteerOnlineAlert_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "HumanitarianCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HumanitarianVolunteerOnlineAlert" ADD CONSTRAINT "HumanitarianVolunteerOnlineAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
