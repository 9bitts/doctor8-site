-- CreateEnum
CREATE TYPE "HumanitarianPriority" AS ENUM ('ROUTINE', 'URGENT', 'CRISIS');

-- AlterTable
ALTER TABLE "HumanitarianQueueEntry" ADD COLUMN "priority" "HumanitarianPriority" NOT NULL DEFAULT 'ROUTINE';

-- CreateIndex
CREATE INDEX "HumanitarianQueueEntry_poolId_status_priority_position_idx" ON "HumanitarianQueueEntry"("poolId", "status", "priority", "position");
