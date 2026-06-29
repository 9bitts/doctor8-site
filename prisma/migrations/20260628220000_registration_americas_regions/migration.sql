-- Expand user region from enum (US/EU/BR/VE) to ISO country codes across the Americas + EU.

ALTER TABLE "User" ALTER COLUMN "region" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "region" TYPE VARCHAR(2) USING "region"::TEXT;
ALTER TABLE "User" ALTER COLUMN "region" SET DEFAULT 'US';

ALTER TABLE "HumanitarianCampaign" ALTER COLUMN "region" TYPE VARCHAR(2) USING "region"::TEXT;

DROP TYPE "UserRegion";
