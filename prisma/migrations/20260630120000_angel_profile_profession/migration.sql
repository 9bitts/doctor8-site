-- Angel profile: profession and volunteer help description for admin review

ALTER TABLE "AngelProfile" ADD COLUMN IF NOT EXISTS "profession" TEXT;
ALTER TABLE "AngelProfile" ADD COLUMN IF NOT EXISTS "volunteerHelp" TEXT;
