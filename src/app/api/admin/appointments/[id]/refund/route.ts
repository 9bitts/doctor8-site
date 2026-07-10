import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { refundPaymentIntentIdempotent } from "@/lib/stripe-refund";

/** Admin — issue Stripe refund for a paid appointment. */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const appointment = await db.appointment.findUnique({
    where: { id: params.id },
    select: { stripePaymentId: true, paidAt: true, status: true },
  });

  if (!appointment?.stripePaymentId) {
    return NextResponse.json({ error: "No Stripe payment on this appointment" }, { status: 400 });
  }
  if (!appointment.paidAt) {
    return NextResponse.json({ error: "Appointment was not paid" }, { status: 400 });
  }

  const refund = await refundPaymentIntentIdempotent(
    appointment.stripePaymentId,
    "admin_manual_refund",
  );

  return NextResponse.json({ ok: true, refund });
}
