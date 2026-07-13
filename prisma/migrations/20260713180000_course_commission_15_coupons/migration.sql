-- Alter default commission to 15% (existing courses keep their value)
ALTER TABLE "Course" ALTER COLUMN "commissionPercent" SET DEFAULT 15;

-- Optional: update test courses that still use 30%
-- UPDATE "Course" SET "commissionPercent" = 15 WHERE "commissionPercent" = 30;

-- Add COUPON to CourseEnrollmentSource
ALTER TYPE "CourseEnrollmentSource" ADD VALUE IF NOT EXISTS 'COUPON';

-- Coupon discount type enum
CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENT', 'FIXED');

-- Course coupons
CREATE TABLE "CourseCoupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "CouponDiscountType" NOT NULL DEFAULT 'PERCENT',
    "discountValue" INTEGER NOT NULL,
    "courseId" TEXT,
    "maxRedemptions" INTEGER,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseCoupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseCoupon_code_key" ON "CourseCoupon"("code");
CREATE INDEX "CourseCoupon_courseId_idx" ON "CourseCoupon"("courseId");

ALTER TABLE "CourseCoupon" ADD CONSTRAINT "CourseCoupon_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Coupon redemptions
CREATE TABLE "CourseCouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "amountOffCents" INTEGER NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseCouponRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CourseCouponRedemption_enrollmentId_key" ON "CourseCouponRedemption"("enrollmentId");
CREATE UNIQUE INDEX "CourseCouponRedemption_couponId_userId_key" ON "CourseCouponRedemption"("couponId", "userId");
CREATE INDEX "CourseCouponRedemption_userId_idx" ON "CourseCouponRedemption"("userId");

ALTER TABLE "CourseCouponRedemption" ADD CONSTRAINT "CourseCouponRedemption_couponId_fkey"
    FOREIGN KEY ("couponId") REFERENCES "CourseCoupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
