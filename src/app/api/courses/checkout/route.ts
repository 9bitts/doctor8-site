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
import { toStripeCurrency } from "@/lib/billing-regions";
import { z } from "zod";

const schema = z.object({
  courseId: z.string(),
  redeemConnection: z.boolean().optional(),
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
    return NextResponse.json({ enrollmentId: enrollment.id, redeemed: true });
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org";
  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card", "pix", "boleto"],
    line_items: [
      {
        price_data: {
          currency,
          unit_amount: course.priceCents,
          product_data: {
            name: course.title,
            description: "Curso Doctor8",
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/cursos/${course.slug}?checkout=success`,
    cancel_url: `${appUrl}/cursos/${course.slug}?checkout=cancelled`,
    metadata: {
      kind: "course_purchase",
      userId: session.user.id,
      courseId: course.id,
      courseSlug: course.slug,
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
