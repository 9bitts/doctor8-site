-- PsychologyAnamnesisInvite: view limits (public link hardening)
ALTER TABLE "PsychologyAnamnesisInvite" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PsychologyAnamnesisInvite" ADD COLUMN IF NOT EXISTS "maxViews" INTEGER NOT NULL DEFAULT 30;
