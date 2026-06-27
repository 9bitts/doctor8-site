-- CreateEnum
CREATE TYPE "HumanitarianCompletionChannel" AS ENUM ('VIDEO', 'WHATSAPP');

-- AlterTable
ALTER TABLE "HumanitarianQueueEntry" ADD COLUMN "completionChannel" "HumanitarianCompletionChannel";
