// Enroll buyer after Stripe payment for a course purchase.

import { db } from "@/lib/db";
import { sendCourseEnrollmentEmail } from "@/lib/course-enrollment-notify";
import { buildCourseApplicationFeeCents } from "@/lib/courses/checkout-payment";
import { recordCouponRedemptionForPurchase } from "@/lib/courses/redeem-coupon";

export type CoursePaymentMeta = {
  kind?: string;
  userId: string;
  courseId: string;
  courseSlug?: string;
  commissionPercent?: string;
  couponId?: string;
  couponAmountOffCents?: string;
};

export async function fulfillCoursePurchase(params: {
  stripePaymentId: string;
  stripeCheckoutSessionId?: string;
  amount: number;
  currency: string;
  metadata: CoursePaymentMeta;
}): Promise<{ enrollmentId: string; created: boolean }> {
  const { stripePaymentId, stripeCheckoutSessionId, amount, currency, metadata } = params;
  const { userId, courseId } = metadata;
  if (!userId || !courseId) throw new Error("Missing course purchase metadata");

  const existing = await db.coursePurchase.findFirst({
    where: {
      OR: [
        { stripePaymentIntentId: stripePaymentId },
        ...(stripeCheckoutSessionId ? [{ stripeCheckoutSessionId }] : []),
      ],
    },
    include: { enrollment: true },
  });
  if (existing?.enrollment) {
    if (metadata.couponId) {
      await recordCouponRedemptionForPurchase({
        couponId: metadata.couponId,
        userId,
        courseId,
        enrollmentId: existing.enrollment.id,
        amountOffCents: Number(metadata.couponAmountOffCents) || 0,
      });
    }
    return { enrollmentId: existing.enrollment.id, created: false };
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, commissionPercent: true, status: true },
  });
  if (!course || course.status !== "PUBLISHED") {
    throw new Error("Course not available");
  }

  const commissionPercent = Number(metadata.commissionPercent) || course.commissionPercent;
  const platformFeeCents = buildCourseApplicationFeeCents(amount, commissionPercent);
  const instructorPayoutCents = amount - platformFeeCents;

  const priorEnrollment = await db.courseEnrollment.findUnique({
    where: { courseId_userId: { courseId, userId } },
    select: { id: true },
  });
  if (priorEnrollment) {
    return { enrollmentId: priorEnrollment.id, created: false };
  }

  const purchase = await db.coursePurchase.create({
    data: {
      courseId,
      buyerUserId: userId,
      amountCents: amount,
      currency: currency.toUpperCase(),
      platformFeeCents,
      instructorPayoutCents,
      stripePaymentIntentId: stripePaymentId,
      stripeCheckoutSessionId: stripeCheckoutSessionId ?? null,
      status: "paid",
      enrollment: {
        create: {
          courseId,
          userId,
          source: "PURCHASE",
        },
      },
    },
    include: { enrollment: true },
  });

  if (!purchase.enrollment) throw new Error("Enrollment not created");

  if (metadata.couponId) {
    await recordCouponRedemptionForPurchase({
      couponId: metadata.couponId,
      userId,
      courseId,
      enrollmentId: purchase.enrollment.id,
      amountOffCents: Number(metadata.couponAmountOffCents) || 0,
    });
  }

  sendCourseEnrollmentEmail({
    userId,
    courseId,
    enrollmentId: purchase.enrollment.id,
  }).catch((err) => console.error("[courses] enrollment email failed", err));

  return { enrollmentId: purchase.enrollment.id, created: true };
}
