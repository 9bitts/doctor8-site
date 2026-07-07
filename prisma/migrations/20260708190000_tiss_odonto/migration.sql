-- TISS odonto guide type + procedure fields on guides

DO $$ BEGIN
  CREATE TYPE "TissGuideType" AS ENUM ('CONSULTA', 'ODONTO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "TissGuide" ADD COLUMN IF NOT EXISTS "guideType" "TissGuideType" NOT NULL DEFAULT 'CONSULTA';
