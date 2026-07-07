-- Doctor Image: public profile personalization on VirtualCard
ALTER TABLE "VirtualCard" ADD COLUMN "whatsappNumber" TEXT;
ALTER TABLE "VirtualCard" ADD COLUMN "coverImageUrl" TEXT;
ALTER TABLE "VirtualCard" ADD COLUMN "galleryImages" JSONB;
ALTER TABLE "VirtualCard" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "VirtualCard" ADD COLUMN "themePreset" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "VirtualCard" ADD COLUMN "accentColor" TEXT;
ALTER TABLE "VirtualCard" ADD COLUMN "contentBlocks" JSONB;
