import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";
import {
  getConnectionRedemptionStatus,
  hasActiveDoctorConnection,
  userHasEnrollment,
  currentPeriodMonth,
} from "@/lib/courses/access";
import { validateCoupon } from "@/lib/courses/coupons";
import { redeemCouponFreeEnrollment } from "@/lib/courses/redeem-coupon";
import { buildCourseCheckoutPaymentIntentData } from "@/lib/courses/checkout-payment";
import {
  getStripeConnectStatusForUser,
  isStripeConnectEnabled,
} from "@/lib/stripe-connect";
import { toStripeCurrency } from "@/lib/billing-regions";
import { z } from "zod";
import { sendCourseEnrollmentEmail } from "@/lib/course-enrollment-notify";

const schema = z.object({
  courseId: z.string(),
  redeemConnection: z.boolean().optional(),
  couponCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const course = await db.course.findUnique({
    where: { id: parsed.data.courseId },
    select: {
      id: true,
      slug: true,
      title: true,
      priceCents: true,
      currency: true,
      status: true,
      instructorUserId: true,
      commissionPercent: true,
    },
  });
  if (!course || course.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Curso não disponível" }, { status: 404 });
  }

  if (await userHasEnrollment(session.user.id, course.id)) {
    const enrollment = await db.courseEnrollment.findUnique({
      where: { courseId_userId: { courseId: course.id, userId: session.user.id } },
      select: { id: true },
    });
    return NextResponse.json({ alreadyEnrolled: true, enrollmentId: enrollment?.id });
  }

  // Free course
  if (course.priceCents === 0) {
    const enrollment = await db.courseEnrollment.create({
      data: {
        courseId: course.id,
        userId: session.user.id,
        source: "FREE",
      },
    });
    sendCourseEnrollmentEmail({
      userId: session.user.id,
      courseId: course.id,
      enrollmentId: enrollment.id,
    }).catch((err) => console.error("[courses] enrollment email failed", err));
    return NextResponse.json({ enrollmentId: enrollment.id, free: true });
  }

  // Doctor Connection — 1 course per month
  if (parsed.data.redeemConnection) {
    const hasConnection = await hasActiveDoctorConnection(session.user.id);
    if (!hasConnection) {
      return NextResponse.json(
        { error: "DOCTOR_CONNECTION_REQUIRED", message: "Assinatura Doctor Connection necessária." },
        { status: 403 },
      );
    }
    const periodMonth = currentPeriodMonth();
    const existingRedemption = await db.courseConnectionRedemption.findUnique({
      where: { userId_periodMonth: { userId: session.user.id, periodMonth } },
    });
    if (existingRedemption) {
      return NextResponse.json(
        { error: "ALREADY_REDEEMED", message: "Você já resgatou seu curso gratuito deste mês." },
        { status: 409 },
      );
    }

    const enrollment = await db.courseEnrollment.create({
      data: {
        courseId: course.id,
        userId: session.user.id,
        source: "DOCTOR_CONNECTION",
        connectionRedemption: {
          create: {
            userId: session.user.id,
            courseId: course.id,
            periodMonth,
          },
        },
      },
    });
    sendCourseEnrollmentEmail({
      userId: session.user.id,
      courseId: course.id,
      enrollmentId: enrollment.id,
    }).catch((err) => console.error("[courses] enrollment email failed", err));
    return NextResponse.json({ enrollmentId: enrollment.id, redeemed: true });
  }

  let finalAmountCents = course.priceCents;
  let couponId: string | undefined;
  let couponAmountOffCents = 0;

  if (parsed.data.couponCode?.trim()) {
    const couponResult = await validateCoupon(
      parsed.data.couponCode,
      course.id,
      session.user.id,
      course.priceCents,
    );
    if (!couponResult.valid) {
      return NextResponse.json(
        { error: "INVALID_COUPON", message: couponResult.reason ?? "Cupom inválido." },
        { status: 400 },
      );
    }
    finalAmountCents = couponResult.finalCents;
    couponAmountOffCents = couponResult.amountOffCents;
    couponId = couponResult.coupon?.id;
  }

  // 100% coupon — enroll without Stripe
  if (finalAmountCents === 0 && couponId) {
    try {
      const { enrollmentId } = await redeemCouponFreeEnrollment({
        couponId,
        userId: session.user.id,
        courseId: course.id,
        amountOffCents: couponAmountOffCents || course.priceCents,
      });
      return NextResponse.json({ enrollmentId, free: true, coupon: true });
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      const messages: Record<string, string> = {
        COUPON_INACTIVE: "Este cupom não está mais ativo.",
        COUPON_EXPIRED: "Este cupom expirou.",
        COUPON_EXHAUSTED: "Este cupom atingiu o limite de usos.",
      };
      return NextResponse.json(
        { error: "INVALID_COUPON", message: messages[code] ?? "Não foi possível aplicar o cupom." },
        { status: 400 },
      );
    }
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const customerId = await getOrCreateStripeCustomer(
    session.user.id,
    user.email,
    session.user.name || user.email,
  );

  const currency = toStripeCurrency(course.currency);
  if (currency !== "brl") {
    return NextResponse.json({ error: "Checkout disponível apenas em BRL no momento." }, { status: 400 });
  }

  let paymentIntentData: ReturnType<typeof buildCourseCheckoutPaymentIntentData> | undefined;
  if (isStripeConnectEnabled()) {
    const { status, accountId } = await getStripeConnectStatusForUser(course.instructorUserId);
    if (status === "active" && accountId) {
      paymentIntentData = buildCourseCheckoutPaymentIntentData(
        finalAmountCents,
        course.commissionPercent,
        accountId,
      );
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org";
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card", "pix", "boleto"],
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: finalAmountCents,
          product_data: {
            name: course.title,
            description: "Curso Doctor8",
          },
        },
        quantity: 1,
      },
    ],
    ...(paymentIntentData ? { payment_intent_data: paymentIntentData } : {}),
    success_url: `${appUrl}/cursos/${course.slug}?checkout=success`,
    cancel_url: `${appUrl}/cursos/${course.slug}?checkout=cancelled`,
    metadata: {
      kind: "course_purchase",
      userId: session.user.id,
      courseId: course.id,
      courseSlug: course.slug,
      commissionPercent: String(course.commissionPercent),
      ...(couponId
        ? {
            couponId,
            couponAmountOffCents: String(couponAmountOffCents),
          }
        : {}),
    },
  });

  return NextResponse.json({ checkoutUrl: checkoutSession.url });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = await getConnectionRedemptionStatus(session.user.id);
  return NextResponse.json(status);
}
