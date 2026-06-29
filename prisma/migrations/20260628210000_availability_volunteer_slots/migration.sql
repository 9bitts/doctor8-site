-- Volunteer-only availability blocks (AcuraBrasil) ? separate from regular paid slots
ALTER TABLE "AvailabilitySlot" ADD COLUMN "volunteerOnly" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PsychoanalystAvailabilitySlot" ADD COLUMN "volunteerOnly" BOOLEAN NOT NULL DEFAULT false;
