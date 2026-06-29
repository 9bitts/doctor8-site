import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import {
  AppointmentSlotTakenError,
  fulfillVolunteerConsultation,
} from "@/lib/fulfill-consultation";
import {
  assertVolunteerSlotBooking,
  VolunteerSlotBookingError,
} from "@/lib/volunteer-slot-booking";
import { z } from "zod";

const VOLUNTEER_ERROR_MESSAGES: Record<string, string> = {
  provider_not_found: "Professional not found.",
  provider_not_volunteer: "This professional is not an AcuraBrasil volunteer.",
  slot_not_found: "This time slot is not available.",
  slot_unavailable: "This slot is no longer available.",
  not_volunteer_slot: "This is not a volunteer time slot.",
};

const schema = z.object({
  professionalId: z.string().optional(),
  psychoanalystId: z.string().optional(),
  providerType: z.enum(["health", "psychoanalyst"]).default("health"),
  scheduledAt: z.string().datetime(),
  type: z.enum(["TELECONSULT", "IN_PERSON"]),
  acceptedCancellationPolicy: z.boolean(),
  bookingSource: z
    .enum(["patient_panel", "public_profile", "public_search", "public_embed", "referral"])
    .optional(),
  visitReason: z.string().max(2000).optional(),
  healthPlanSlug: z.string().max(80).optional(),
  healthPlanLabel: z.string().max(120).optional(),
  serviceId: z.string().optional(),
  serviceName: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  if (!parsed.data.acceptedCancellationPolicy) {
    return NextResponse.json(
      { error: { general: ["Cancellation policy must be accepted."] } },
      { status: 400 },
    );
  }

  const { scheduledAt, type, providerType } = parsed.data;
  const providerId =
    providerType === "psychoanalyst"
      ? parsed.data.psychoanalystId || parsed.data.professionalId
      : parsed.data.professionalId || parsed.data.psychoanalystId;

  if (!providerId) {
    return NextResponse.json({ error: { general: ["Provider not specified."] } }, { status: 400 });
  }

  try {
    await assertVolunteerSlotBooking(providerId, providerType, scheduledAt);
  } catch (e) {
    if (e instanceof VolunteerSlotBookingError) {
      const msg = VOLUNTEER_ERROR_MESSAGES[e.code] || "Invalid volunteer slot.";
      return NextResponse.json({ error: { general: [msg] } }, { status: 400 });
    }
    throw e;
  }

  const verified =
    providerType === "psychoanalyst"
      ? await db.psychoanalystProfile.findUnique({ where: { id: providerId, verified: true } })
      : await db.professionalProfile.findUnique({ where: { id: providerId, verified: true } });

  if (!verified) {
    return NextResponse.json({ error: { general: ["Professional not found."] } }, { status: 404 });
  }

  try {
    const result = await fulfillVolunteerConsultation({
      userId: session.user.id,
      providerType,
      providerId,
      scheduledAt,
      type,
      acceptedCancellationPolicy: parsed.data.acceptedCancellationPolicy,
      bookingSource: parsed.data.bookingSource ?? "patient_panel",
      visitReason: parsed.data.visitReason,
      healthPlanSlug: parsed.data.healthPlanSlug,
      healthPlanLabel: parsed.data.healthPlanLabel,
      serviceId: parsed.data.serviceId,
      serviceName: parsed.data.serviceName,
    });

    await audit.viewRecord(session.user.id, "Appointment", result.appointmentId);
    return NextResponse.json(
      { success: true, appointmentId: result.appointmentId },
      { status: result.created ? 201 : 200 },
    );
  } catch (e) {
    if (e instanceof AppointmentSlotTakenError) {
      return NextResponse.json(
        { error: { general: ["This slot is no longer available."] } },
        { status: 409 },
      );
    }
    throw e;
  }
}
