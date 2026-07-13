import { db } from "@/lib/db";
import { sendCourseEnrollmentEmail } from "@/lib/course-enrollment-notify";

export async function redeemCouponFreeEnrollment(params: {
  couponId: string;
  userId: string;
  courseId: string;
  amountOffCents: number;
}): Promise<{ enrollmentId: string }> {
  const { couponId, userId, courseId, amountOffCents } = params;

  return db.$transaction(async (tx) => {
    const coupon = await tx.courseCoupon.findUnique({
      where: { id: couponId },
      select: {
        id: true,
        active: true,
        maxRedemptions: true,
        redemptionCount: true,
        expiresAt: true,
      },
    });
    if (!coupon || !coupon.active) {
      throw new Error("COUPON_INACTIVE");
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new Error("COUPON_EXPIRED");
    }
    if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) {
      throw new Error("COUPON_EXHAUSTED");
    }

    const existingRedemption = await tx.courseCouponRedemption.findUnique({
      where: { couponId_userId: { couponId, userId } },
      select: { enrollmentId: true },
    });
    if (existingRedemption?.enrollmentId) {
      return { enrollmentId: existingRedemption.enrollmentId };
    }

    const priorEnrollment = await tx.courseEnrollment.findUnique({
      where: { courseId_userId: { courseId, userId } },
      select: { id: true },
    });
    if (priorEnrollment) {
      return { enrollmentId: priorEnrollment.id };
    }

    const enrollment = await tx.courseEnrollment.create({
      data: {
        courseId,
        userId,
        source: "COUPON",
      },
    });

    await tx.courseCouponRedemption.create({
      data: {
        couponId,
        userId,
        courseId,
        enrollmentId: enrollment.id,
        amountOffCents,
      },
    });

    await tx.courseCoupon.update({
      where: { id: couponId },
      data: { redemptionCount: { increment: 1 } },
    });

    sendCourseEnrollmentEmail({
      userId,
      courseId,
      enrollmentId: enrollment.id,
    }).catch((err) => console.error("[courses] enrollment email failed", err));

    return { enrollmentId: enrollment.id };
  });
}

export async function recordCouponRedemptionForPurchase(params: {
  couponId: string;
  userId: string;
  courseId: string;
  enrollmentId: string;
  amountOffCents: number;
}): Promise<void> {
  const { couponId, userId, courseId, enrollmentId, amountOffCents } = params;

  const existing = await db.courseCouponRedemption.findUnique({
    where: { couponId_userId: { couponId, userId } },
    select: { id: true },
  });
  if (existing) return;

  await db.$transaction(async (tx) => {
    const coupon = await tx.courseCoupon.findUnique({
      where: { id: couponId },
      select: { maxRedemptions: true, redemptionCount: true, active: true },
    });
    if (!coupon?.active) return;

    const dup = await tx.courseCouponRedemption.findUnique({
      where: { couponId_userId: { couponId, userId } },
      select: { id: true },
    });
    if (dup) return;

    if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) {
      console.warn("[courses] coupon exhausted at fulfill time", { couponId, userId });
      return;
    }

    await tx.courseCouponRedemption.create({
      data: {
        couponId,
        userId,
        courseId,
        enrollmentId,
        amountOffCents,
      },
    });

    await tx.courseCoupon.update({
      where: { id: couponId },
      data: { redemptionCount: { increment: 1 } },
    });
  });
}
