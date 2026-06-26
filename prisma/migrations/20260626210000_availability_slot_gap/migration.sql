-- AlterTable
ALTER TABLE "AvailabilitySlot" ADD COLUMN "slotGapMins" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PsychoanalystAvailabilitySlot" ADD COLUMN "slotGapMins" INTEGER NOT NULL DEFAULT 0;
