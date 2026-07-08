import { db } from "@/lib/db";
import { EAP_BOOKING_SOURCE } from "@/lib/employer-eap-booking";

const DEFAULT_SESSION_PRICE_CENTS = 12000;

/** Records gross session value on completed EAP appointments for provider financeiro. */
export async function settleEapCorporateAppointment(appointmentId: string): Promise<void> {
  const appt = await db.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      bookingSource: true,
      status: true,
      paidAt: true,
      professionalId: true,
      employerWorkforceMember: {
        select: { employerCompanyId: true },
      },
    },
  });

  if (!appt || appt.bookingSource !== EAP_BOOKING_SOURCE) return;
  if (appt.status !== "COMPLETED") return;
  if (appt.paidAt) return;
  if (!appt.professionalId || !appt.employerWorkforceMember) return;

  const eapBenefit = await db.employerEapBenefit.findUnique({
    where: { employerCompanyId: appt.employerWorkforceMember.employerCompanyId },
    select: { sessionPriceCents: true },
  });

  const grossCents = eapBenefit?.sessionPriceCents ?? DEFAULT_SESSION_PRICE_CENTS;
  if (grossCents <= 0) return;

  await db.appointment.update({
    where: { id: appointmentId },
    data: {
      priceAmount: grossCents,
      paidAt: new Date(),
      currency: "BRL",
    },
  });
}

/** Creates a paid JitPayment record for completed corporate EAP JIT sessions. */
export async function settleEapCorporateJitQueue(queueEntryId: string): Promise<void> {
  const entry = await db.jitQueue.findUnique({
    where: { id: queueEntryId },
    select: {
      status: true,
      paymentId: true,
      employerWorkforceMemberId: true,
      employerWorkforceMember: {
        select: { employerCompanyId: true },
      },
      session: {
        select: { professionalId: true },
      },
    },
  });

  if (!entry?.employerWorkforceMemberId || !entry.employerWorkforceMember) return;
  if (entry.status !== "DONE") return;
  if (entry.paymentId) return;

  const eapBenefit = await db.employerEapBenefit.findUnique({
    where: { employerCompanyId: entry.employerWorkforceMember.employerCompanyId },
    select: { sessionPriceCents: true },
  });

  const grossCents = eapBenefit?.sessionPriceCents ?? DEFAULT_SESSION_PRICE_CENTS;
  if (grossCents <= 0) return;

  const payment = await db.jitPayment.create({
    data: {
      amount: grossCents,
      currency: "BRL",
      paidAt: new Date(),
      status: "paid",
    },
  });

  await db.jitQueue.update({
    where: { id: queueEntryId },
    data: { paymentId: payment.id },
  });
}
